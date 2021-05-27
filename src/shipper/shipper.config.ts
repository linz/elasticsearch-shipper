import { Connection } from '@elastic/elasticsearch';
import { CloudWatchLogsDecodedData, CloudWatchLogsLogEvent } from 'aws-lambda';
import { SSM } from 'aws-sdk';
import minimatch from 'minimatch';
import {
  LogShipperConfig,
  LogShipperConfigAccount,
  LogShipperConfigLogGroup,
  LogShipperConnection,
} from '../config/config';
import { ConnectionValidator, LogShipperConfigValidator, LogShipperElasticValidator } from '../config/config.elastic';
import { DefaultConfigRefreshTimeoutSeconds, DefaultParameterStoreBasePath, Env } from '../env';
import { Log } from '../logger';
import { ElasticSearch } from './elastic';
import { onLogExtractJson } from './log.funcs/extract.json';
import { onLogTag } from './log.funcs/tag';
import { LogObject, LogProcessFunction } from './type';

export const RefreshTimeoutSeconds = Number(
  process.env[Env.ConfigRefreshTimeoutSeconds] ?? DefaultConfigRefreshTimeoutSeconds,
);

export const ssm = new SSM();

export class LogShipper {
  static INSTANCE: LogShipper | null;
  initializedAt: number;
  config: LogShipperConfig;
  es: ElasticSearch;

  static DefaultLogProcessFunctions = [onLogExtractJson, onLogTag];

  /**
   * Optional log process to dynamically filter logs
   *
   * @returns true to drop the log line, false to keep it
   */
  onLog: LogProcessFunction[] = [];

  /**
   * Retrieve configuration from parameter store.
   * @param configName The name of the configuration in parameter store.
   */
  static async parameterStoreConfig(configName: string): Promise<Record<string, unknown>> {
    const config = await ssm.getParameter({ Name: configName }).promise();
    if (config.Parameter == null) throw new Error(`Could not retrieve parameter at ${configName}`);
    return JSON.parse(config.Parameter.Value as string);
  }

  static async load(): Promise<LogShipper> {
    if (LogShipper.INSTANCE == null || LogShipper.INSTANCE.isRefreshNeeded) {
      const configName = process.env[Env.ConfigName] ?? DefaultParameterStoreBasePath;
      const data = await LogShipper.parameterStoreConfig(configName);
      const cfg = LogShipperConfigValidator.parse(data);

      LogShipper.INSTANCE = new LogShipper(cfg);
    }
    return LogShipper.INSTANCE;
  }

  constructor(config: LogShipperConfig) {
    this.config = config;
    this.initializedAt = Date.now();
    this.es = new ElasticSearch();

    for (const fn of LogShipper.DefaultLogProcessFunctions) this.onLog.push(fn);
  }

  getAccount(accountId: string): LogShipperConfigAccount | undefined {
    return this.config.accounts.find((f) => f.id === accountId);
  }

  getLogConfig(account: LogShipperConfigAccount, logGroup: string): LogShipperConfigLogGroup | undefined {
    return account.logGroups.find((f) => minimatch(logGroup, f.filter));
  }

  _connection: Promise<LogShipperConnection>;
  getConnection(logger: typeof Log): Promise<LogShipperConnection> {
    if (this._connection == null) {
      // Load a connection string from the parameter store
      const ssmCfg = ConnectionValidator.Ssm.safeParse(this.config.elastic);
      if (ssmCfg.success) {
        const configName = ssmCfg.data.name;
        this._connection = LogShipper.parameterStoreConfig(configName).then(async (res) => {
          try {
            return LogShipperElasticValidator.parse(res);
          } catch (e) {
            logger.error({ configName }, 'Failed to parse SSM parameter');
            throw e;
          }
        });
      } else {
        this._connection = Promise.resolve(this.config.elastic);
      }
    }
    return this._connection;
  }

  async save(logger: typeof Log): Promise<void> {
    const connection = await this.getConnection(logger);
    this.es.save(connection, logger);
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
