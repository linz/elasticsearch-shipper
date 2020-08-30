import { Client } from '@elastic/elasticsearch';
import { AmazonConnection, AmazonTransport } from 'aws-elasticsearch-connector';
import { LogShipperConfig, LogShipperConfigIndexDate } from '../config/config';
import { ConnectionValidator } from '../config/config.elastic';
import { getIndexDate } from './elastic.index';
import { LogObject } from './type';
import { Log } from '../logger';

export interface ElasticSearchIndex {
  _id: string;
  _index: string;
  _type: '_doc';
}
export interface ElasticSearchBulkResponse {
  took: number;
  items: { index: { status: number } }[];
}

export type ElasticSearchBulk = { index: ElasticSearchIndex } | LogObject;

export class ElasticSearch {
  _client: Client | null;

  body: ElasticSearchBulk[] = [];
  indexes: Record<string, boolean> = {};
  config: LogShipperConfig;

  constructor(config: LogShipperConfig) {
    this.config = config;
  }

  get client(): Client {
    if (this._client != null) return this._client;
    const connection = this.config.elastic;

    if (ConnectionValidator.Cloud.check(connection)) {
      this._client = new Client({
        cloud: { id: connection.id },
        auth: { username: connection.username, password: connection.password },
      });
    }

    if (ConnectionValidator.Aws.check(connection)) {
      this._client = new Client({
        node: connection.url,
        Connection: AmazonConnection,
        Transport: AmazonTransport,
      });
    }

    if (ConnectionValidator.Basic.check(connection)) {
      this._client = new Client({
        node: connection.url,
        auth: { username: connection.username, password: connection.password },
      });
    }

    if (this._client == null) throw new Error('Failed to create connection to elastic search');
    return this._client;
  }

  /**
   * Queue a logObject to be bulk inserted
   * @param logObj log to queue
   */
  queue(logObj: LogObject, prefix: string, indexType: LogShipperConfigIndexDate): void {
    const indexName = this.getIndexName(logObj, prefix, indexType);
    this.indexes[indexName] = true;
    this.body.push({ index: { _index: indexName, _type: '_doc', _id: logObj['@id'] } });
    this.body.push(logObj);
  }

  /**
   * Load all the items in the queue into elastic search
   *
   * @returns list of log objects that failed to load
   */
  async save(logger: typeof Log): Promise<LogObject[]> {
    const body = this.body;
    this.body = [];

    logger.info({ logCount: body.length / 2, indexList: Object.keys(this.indexes) }, 'LoadingLogs');
    this.indexes = {};

    if (body.length <= 0) return [];
    const res = await this.client.bulk({ body });
    if (res.statusCode == null || res.statusCode < 200 || res.statusCode > 300) {
      logger.error({ res: res.body, status: res.statusCode }, 'Failed to insert');
      throw Error('Unable to insert logs');
    }

    // Bulk loads have a lot of information about what happened to every input
    const info: ElasticSearchBulkResponse = res.body;
    const failed: LogObject[] = [];
    for (let i = 0; i < info.items.length; i++) {
      const item = info.items[i];
      // For every insert there is a "index" and "body" line
      const bodyIndex = i * 2 + 1;
      // Failed to insert a item, lookup which item it was from the items list
      if (item.index.status >= 300) {
        logger.error({ logMessage: JSON.stringify(body[bodyIndex]) }, 'FailedIndex');
        failed.push(body[bodyIndex] as LogObject);
      }
    }

    if (failed.length > 0) {
      logger.warn({ failed, total: info.items.length }, 'FailedItems');
      return failed;
    }

    logger.info({ logCount: body.length / 2, indexList: Object.keys(this.indexes) }, 'LogsInserted');

    return [];
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
