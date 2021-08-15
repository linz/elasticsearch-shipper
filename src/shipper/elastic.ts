import { awsGetCredentials, createAWSConnection } from '@acuris/aws-es-connection';
import { Client } from '@elastic/elasticsearch';
import { OnDropDocument } from '@elastic/elasticsearch/lib/Helpers';
import { LogShipperConfigIndexDate } from '../config/config';
import { ConnectionValidator } from '../config/config.elastic';
import { Log } from '../logger';
import { getIndexDate } from './elastic.index';
import { ConfigCache } from './config';
import { LogObject } from './type';

export class ElasticSearch {
  _client: Promise<Client> | null;

  logs: LogObject[] = [];
  indexes: Map<string, string> = new Map();
  connectionId: string;

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  private async createClient(): Promise<Client> {
    const cfg = await ConfigCache.get(this.connectionId);
    const cloud = ConnectionValidator.Cloud.safeParse(cfg);
    if (cloud.success) {
      return new Client({
        cloud: { id: cloud.data.id },
        auth: { username: cloud.data.username, password: cloud.data.password },
      });
    }

    const basic = ConnectionValidator.Basic.safeParse(cfg);
    if (basic.success) {
      return new Client({
        node: basic.data.url,
        auth: { username: basic.data.username, password: basic.data.password },
      });
    }

    const aws = ConnectionValidator.Aws.safeParse(cfg);
    if (aws.success) {
      const awsCredentials = await awsGetCredentials();
      const AWSConnection = createAWSConnection(awsCredentials);
      return new Client({
        ...AWSConnection,
        node: aws.data.url,
      });
    }

    throw new Error('Failed to create connection to elastic search: ' + this.connectionId);
  }

  /**
   * Queue a logObject to be bulk inserted
   * @param logObj log to queue
   */
  queue(logObj: LogObject, prefix: string, indexType: LogShipperConfigIndexDate): void {
    const indexName = this.getIndexName(logObj, prefix, indexType);
    this.indexes.set(logObj['@id'], indexName);
    this.logs.push(logObj);
  }

  get logCount(): number {
    return this.logs.length;
  }

  /**
   * Load all the items in the queue into elastic search
   */
  async save(LogOpt?: typeof Log): Promise<void> {
    const client = await this.createClient();
    const startTime = Date.now();
    const logs = this.logs;
    const indexes = this.indexes;
    this.logs = [];
    this.indexes = new Map();
    const logger = LogOpt?.child({ elasticId: this.connectionId });

    const indexesUsed = new Set<string>();
    const stats = await client.helpers.bulk({
      datasource: logs,
      onDocument: (lo: LogObject) => {
        const indexName = indexes.get(lo['@id']) as string;
        indexesUsed.add(indexName);
        return {
          index: { _index: indexName },
        };
      },
      onDrop(lo: OnDropDocument<LogObject>) {
        const indexName = indexes.get(lo.document['@id']);
        logger?.error({ indexName, logMessage: JSON.stringify(lo.document), error: lo.error }, 'FailedIndex');
      },
      // Wait up to 1 second before flushing
      flushInterval: 1000,
    });

    const duration = Date.now() - startTime;
    const indexList = [...indexesUsed.keys()];
    if (stats.failed > 0) {
      logger?.error({ stats, indexList, duration }, 'Inserts:Failed');
    } else {
      logger?.info({ stats, indexList, duration }, 'Inserts:Ok');
    }
  }

  /**
   * Get the elasticsearch index to use for a log line
   *
   * @param logObj full log object
   */
  getIndexName(logObj: LogObject, prefix: string, indexType: LogShipperConfigIndexDate): string {
    const indexDate = getIndexDate(logObj['@timestamp'], indexType);
    return `${prefix}-${indexDate}`;
  }
}
