import { awsGetCredentials, createAWSConnection } from '@acuris/aws-es-connection';
import { Client } from '@elastic/elasticsearch';
import { OnDropDocument } from '@elastic/elasticsearch/lib/Helpers';
import { LogShipperConfig, LogShipperConfigIndexDate } from '../config/config';
import { ConnectionValidator } from '../config/config.elastic';
import { Log } from '../logger';
import { getIndexDate } from './elastic.index';
import { LogObject } from './type';

export class ElasticSearch {
  _client: Promise<Client> | null;

  logs: LogObject[] = [];
  indexes: Map<string, string> = new Map();
  config: LogShipperConfig;

  constructor(config: LogShipperConfig) {
    this.config = config;
  }

  get client(): Promise<Client> {
    if (this._client == null) this._client = this.createClient();
    return this._client;
  }

  private async createClient(): Promise<Client> {
    const connection = this.config.elastic;

    if (ConnectionValidator.Cloud.check(connection)) {
      return new Client({
        cloud: { id: connection.id },
        auth: { username: connection.username, password: connection.password },
      });
    }

    if (ConnectionValidator.Basic.check(connection)) {
      return new Client({
        node: connection.url,
        auth: { username: connection.username, password: connection.password },
      });
    }

    if (ConnectionValidator.Aws.check(connection)) {
      const awsCredentials = await awsGetCredentials();
      const AWSConnection = createAWSConnection(awsCredentials);
      return new Client({
        ...AWSConnection,
        node: connection.url,
      });
    }

    throw new Error('Failed to create connection to elastic search');
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

  /**
   * Load all the items in the queue into elastic search
   *
   * @returns list of log objects that failed to load
   */
  async save(logger: typeof Log): Promise<void> {
    const startTime = Date.now();
    const logs = this.logs;
    const indexes = this.indexes;
    this.logs = [];
    this.indexes = new Map();

    const indexesUsed = new Set<string>();
    const client = await this.client;
    const stats = await client.helpers.bulk({
      datasource: logs,
      onDocument: (lo: LogObject) => {
        const indexName = indexes.get(lo['@id']) as string;
        indexesUsed.add(indexName);
        return {
          index: { _index: indexName },
        };
      },
      onDrop(err: OnDropDocument<LogObject>) {
        logger.error({ logMessage: JSON.stringify(err.document), error: err.error }, 'FailedIndex');
      },
      // Wait up to 1 second before flushing
      flushInterval: 1000,
    });

    const duration = Date.now() - startTime;
    const indexList = [...indexesUsed.keys()];
    if (stats.failed > 0) {
      logger.error({ stats, indexList, duration }, 'Inserts:Failed');
    } else {
      logger.info({ stats, indexList, duration }, 'Inserts:Ok');
    }
  }

  /**
   * Get the elasticsearch index to use for a log line
   *
   * @param logObj full log object
   */
  getIndexName(logObj: LogObject, prefix: string, indexType: LogShipperConfigIndexDate): string {
    const indexDate = getIndexDate(logObj['@timestamp'], indexType);
    return `${prefix}-${logObj['@owner']}-${indexDate}`;
  }
}
