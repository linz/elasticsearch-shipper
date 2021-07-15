export const DefaultConfigRefreshTimeoutSeconds = '300';
export const DefaultExecutionTimeoutSeconds = 30;
export const DefaultParameterStoreBasePath = '/es-shipper-config/accounts';

export const Env = {
  /** Name of the bucket to get log files from */
  BucketName: 'BUCKET_NAME',
  /** Parameter store name to retrieve config from */
  ConfigUri: 'CONFIG_URI',
  /** How long the config should be cached in seconds*/
  ConfigRefreshTimeoutSeconds: 'CONFIG_REFRESH_TIMEOUT_SECONDS',
  /** Maximum execution time of the lambda */
  ExecutionTimeoutSeconds: 'EXECUTION_TIMEOUT_SECONDS',

  /** Commit hash that this was deployed from */
  GitHash: 'GIT_HASH',

  /** Last git version */
  GitVersion: 'GIT_VERSION',
};
