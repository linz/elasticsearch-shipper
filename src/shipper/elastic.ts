import { awsGetCredentials, createAWSConnection } from '@acuris/aws-es-connection';
import { Client } from '@elastic/elasticsearch';
import { OnDropDocument } from '@elastic/elasticsearch/lib/Helpers';
import { LogType } from '@linzjs/lambda';
import { LogShipperConfigIndexDate } from '../config/config.js';
import { ConnectionValidator } from '../config/config.elastic.js';
import { ConfigCache } from './config.js';
import { getIndexDate } from './elastic.index.js';
import { LogObject, LogTransformRequest } from './type.js';

export interface FailedInsertDocument {
  reason: {
    type: string;
    reason: string;
    caused_by: {
      type: string;
      reason: string;
    };
  };
  document: string;
  '@id': string;
  '@timestamp': string;
  '@index': string;
}

export interface ElasticSearchDeadLetterQueueConfig {
  /** Name prefix of the DLQ @default "dlq" */
  name: string;
  /** Indexing pattern date @default daily  */
  indexDate: LogShipperConfigIndexDate;
}

export interface ElasticSearchOptions {
  dlq: ElasticSearchDeadLetterQueueConfig;
  /** Number of bytes to slice the message down to when failing to index  */
  maxSizeBytes: number;
}

export class ElasticSearch {
  logs: LogObject[] = [];
  indexes: Map<string, string> = new Map();
  connectionId: string;

  constructor(connectionId: string) {
    this.connectionId = connectionId;
  }

  private _client: Promise<Client> | null;
  get client(): Promise<Client> {
    if (this._client == null) this._client = this.createClient();
    return this._client;
  }

  async close(): Promise<void> {
    if (this._client == null) return;
    const client = await this._client;
    await client.close();
    this._client = null;
  }

  async createClient(): Promise<Client> {
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
  queue(ctx: LogTransformRequest): void {
    const indexName = this.getIndexName(ctx.log, ctx.prefix, ctx.indexDate);
    this.indexes.set(ctx.log['@id'], indexName);
    this.logs.push(ctx.log);
  }

  get logCount(): number {
    return this.logs.length;
  }

  /**
   * Load all the items in the queue into elastic search
   */
  async save(LogOpt?: LogType): Promise<void> {
    if (this.logCount === 0) return;
    const client = await this.client;
    const startTime = Date.now();
    const logs = this.logs;
    const indexes = this.indexes;
    this.logs = [];
    this.indexes = new Map();
    const logger = LogOpt?.child({ elasticId: this.connectionId });

    const droppedLogs: FailedInsertDocument[] = [];
    const indexesUsed = new Set<string>();
    const stats = await client.helpers.bulk({
      datasource: logs,
      onDocument: (lo: LogObject) => {
        const indexName = indexes.get(lo['@id']) as string;
        indexesUsed.add(indexName);
        return { index: { _index: indexName } };
      },
      onDrop(lo: OnDropDocument<LogObject>) {
        const document = JSON.stringify(lo.document);
        const indexName = indexes.get(lo.document['@id']);

        droppedLogs.push({
          '@id': lo.document['@id'],
          '@timestamp': lo.document['@timestamp'],
          '@index': indexName ?? 'unknown',
          document,
          reason: lo.error,
        });
      },
      // Wait up to 1 second before flushing
      flushInterval: 1000,
    });

    const duration = Date.now() - startTime;
    const indexList = [...indexesUsed.keys()];
    if (droppedLogs.length > 0) {
      // Save all the failed documents into a dead letter queue with the same name
      const dlqStats = await client.helpers.bulk({
        datasource: droppedLogs,
        onDocument: (lo: FailedInsertDocument) => {
          const cfg = ConfigCache.getOptions(this.connectionId);
          // Create a new index always prefixed with dlq and always suffixed with todays date
          const indexName = `${cfg.dlq.name}-${getIndexDate(lo['@timestamp'], cfg.dlq.indexDate)}`;
          return { index: { _index: indexName } };
        },
        onDrop: (lo: OnDropDocument<FailedInsertDocument>) => {
          const cfg = ConfigCache.getOptions(this.connectionId);

          const indexName = indexes.get(lo.document['@id']);
          const document = JSON.stringify(lo.document);
          logger?.error({ indexName, logMessage: document.slice(0, cfg.maxSizeBytes), error: lo.error }, 'FailedIndex');
        },
        // Wait up to 1 second before flushing
        flushInterval: 1000,
      });
      logger?.error({ stats, dlqStats, indexList, duration }, 'Inserts:Failed');
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
