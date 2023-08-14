import { LogType } from '@linzjs/lambda';
import { CloudWatchLogsDecodedData, CloudWatchLogsLogEvent } from 'aws-lambda';
import minimatch from 'minimatch';
import { LogShipperConfigAccount, LogShipperConfigLogGroup } from '../config/config.js';
import { ElasticSearch } from './elastic.js';
import { LogObject, LogProcessFunction } from './type.js';

export class LogShipper {
  static INSTANCE: LogShipper | null;
  accounts: LogShipperConfigAccount[];

  /**
   * Optional log process to dynamically filter logs
   *
   * @returns true to drop the log line, false to keep it
   */
  onLog: LogProcessFunction[] = [];

  static async get(): Promise<LogShipper> {
    if (LogShipper.INSTANCE == null) throw new Error('LogShipper has not been configured');
    return LogShipper.INSTANCE;
  }

  static configure(accounts: LogShipperConfigAccount[]): LogShipper {
    if (LogShipper.INSTANCE) throw new Error('Duplicate LogShipper configuration');
    LogShipper.INSTANCE = new LogShipper(accounts);
    return LogShipper.INSTANCE;
  }

  constructor(accounts: LogShipperConfigAccount[]) {
    this.accounts = accounts;
  }

  getAccounts(accountId: string): LogShipperConfigAccount[] {
    return this.accounts.filter((f) => f.id === accountId);
  }

  getLogConfig(account: LogShipperConfigAccount, logGroup: string): LogShipperConfigLogGroup | undefined {
    if (account == null || account.logGroups == null) return;
    return account.logGroups.find((f) => minimatch(logGroup, f.filter));
  }

  get logCount(): number {
    let total = 0;
    for (const elastic of this.elastic.values()) total += elastic.logCount;
    return total;
  }

  async save(logger: LogType): Promise<void> {
    for (const elastic of this.elastic.values()) {
      await elastic.save(logger);
      await elastic.close();
    }
  }

  elastic: Map<string, ElasticSearch> = new Map();
  getElastic(account: LogShipperConfigAccount): ElasticSearch {
    let existing = this.elastic.get(account.elastic);
    if (existing == null) {
      existing = new ElasticSearch(account.elastic);
      this.elastic.set(account.elastic, existing);
    }
    return existing;
  }

  /**
   * Process a log object determining whether or not to keep it
   * @param obj source log stream used for additional information
   * @param log
   * @param s3Key
   */
  getLogObject(
    obj: CloudWatchLogsDecodedData,
    log: CloudWatchLogsLogEvent,
    s3Key?: string,
    shipperId?: string,
  ): null | LogObject {
    if (log === undefined) return null;

    const logObj: LogObject = {
      '@id': log.id,
      '@timestamp': new Date(log.timestamp).toISOString(),
      '@timestampShipped': new Date().toISOString(),
      '@owner': obj.owner,
      '@logGroup': obj.logGroup,
      '@logStream': obj.logStream,
      '@source': s3Key,
      '@shipperId': shipperId,
      '@tags': [],
      message: log.message,
    };

    if (logObj['@timestamp'] == null) logObj['@timestamp'] = new Date().toISOString();

    return logObj;
  }
}
