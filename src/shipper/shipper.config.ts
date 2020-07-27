import { SSM } from 'aws-sdk';
import { Env, DefaultConfigRefreshTimeoutSeconds, DefaultParameterStoreBasePath } from '../env';
import { LogShipperConfig, LogShipperConfigAccount, LogShipperConfigLogGroup } from '../config/config';
import { LogShipperConfigValidator } from '../config/config.elastic';
import { ElasticSearch } from './elastic';
import minimatch from 'minimatch';

export const RefreshTimeoutSeconds = Number(
  process.env[Env.ConfigRefreshTimeoutSeconds] ?? DefaultConfigRefreshTimeoutSeconds,
);
export const ssm = new SSM();

export class LogShipper {
  static INSTANCE: LogShipper | null;
  initializedAt: number;
  config: LogShipperConfig;
  es: ElasticSearch;

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
    this.es = new ElasticSearch(config);
  }

  getAccount(accountId: string): LogShipperConfigAccount | undefined {
    return this.config.accounts.find((f) => f.id == accountId);
  }

  getLogConfig(account: LogShipperConfigAccount, logGroup: string): LogShipperConfigLogGroup | undefined {
    return account.logGroups.find((f) => minimatch(logGroup, f.filter));
  }

  /**
   * Check whether the config is due to be refreshed.
   */
  get isRefreshNeeded(): boolean {
    return this.initializedAt + RefreshTimeoutSeconds * 1000 < new Date().getTime();
  }
}
