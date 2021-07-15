import { CloudWatchLogsDecodedData, CloudWatchLogsLogEvent } from 'aws-lambda';
import minimatch from 'minimatch';
import { LogShipperConfigAccount, LogShipperConfigLogGroup } from '../config/config';
import { LogShipperConfigAccountValidator } from '../config/config.elastic';
import { DefaultConfigRefreshTimeoutSeconds, Env } from '../env';
import { Log } from '../logger';
import { ElasticSearch } from './elastic';
import { onLogExtractJson } from './log.funcs/extract.json';
import { onLogTag } from './log.funcs/tag';
import { ConfigCache } from './config';
import { LogObject, LogProcessFunction } from './type';

export const RefreshTimeoutSeconds = Number(
  process.env[Env.ConfigRefreshTimeoutSeconds] ?? DefaultConfigRefreshTimeoutSeconds,
);

export class LogShipper {
  static INSTANCE: LogShipper | null;
  initializedAt: number;
  accounts: LogShipperConfigAccount[];

  static DefaultLogProcessFunctions = [onLogExtractJson, onLogTag];

  /**
   * Optional log process to dynamically filter logs
   *
   * @returns true to drop the log line, false to keep it
   */
  onLog: LogProcessFunction[] = [];

  static async load(logger?: typeof Log): Promise<LogShipper> {
    if (LogShipper.INSTANCE == null || LogShipper.INSTANCE.isRefreshNeeded) {
      const configUri = process.env[Env.ConfigUri];
      if (configUri == null) throw new Error(`Failed to load configuration $${Env.ConfigUri} is missing`);
      const configRaw = await ConfigCache.get(configUri);

      const accounts: LogShipperConfigAccount[] = [];

      if (!Array.isArray(configRaw)) throw new Error('Configuration is not an array uri:' + configUri);
      for (const account of configRaw) {
        const res = LogShipperConfigAccountValidator.safeParse(account);
        if (!res.success) {
          logger?.fatal({ errors: res.error }, 'Failed to parse uri:' + configUri);
          throw new Error('Failed to parse uri:' + configUri);
        }
        accounts.push(account);
      }

      LogShipper.INSTANCE = new LogShipper(accounts);
    }
    return LogShipper.INSTANCE;
  }

  constructor(accounts: LogShipperConfigAccount[]) {
    this.accounts = accounts;
    this.initializedAt = Date.now();

    for (const fn of LogShipper.DefaultLogProcessFunctions) this.onLog.push(fn);
  }

  getAccount(accountId: string): LogShipperConfigAccount | undefined {
    return this.accounts.find((f) => f.id === accountId);
  }

  getLogConfig(account: LogShipperConfigAccount, logGroup: string): LogShipperConfigLogGroup | undefined {
    return account.logGroups.find((f) => minimatch(logGroup, f.filter));
  }

  get logCount(): number {
    let total = 0;
    for (const elastic of this.elastic.values()) total += elastic.logCount;
    return total;
  }

  async save(logger: typeof Log): Promise<void> {
    for (const elastic of this.elastic.values()) {
      await elastic.save(logger);
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
  getLogObject(obj: CloudWatchLogsDecodedData, log: CloudWatchLogsLogEvent, s3Key?: string): null | LogObject {
    if (log === undefined) return null;

    const logObj: LogObject = {
      '@id': log.id,
      '@timestamp': new Date(log.timestamp).toISOString(),
      '@owner': obj.owner,
      '@logGroup': obj.logGroup,
      '@logStream': obj.logStream,
      '@source': s3Key,
      '@tags': [],
      message: log.message,
    };

    if (logObj['@timestamp'] == null) logObj['@timestamp'] = new Date().toISOString();

    for (const logFn of this.onLog) {
      if (logFn(logObj) === true) return null;
    }

    return logObj;
  }
  /**
   * Check whether the config is due to be refreshed.
   */
  get isRefreshNeeded(): boolean {
    return this.initializedAt + RefreshTimeoutSeconds * 1000 < new Date().getTime();
  }
}
