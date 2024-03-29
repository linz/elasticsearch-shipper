import * as z from 'zod';

export const LogShipperConnectionCloudValidator = z.object({
  /** Elastic.co Cloud ID */
  id: z.string(),
  /** Username to use */
  username: z.string(),
  /** Password to use */
  password: z.string(),
});

export const LogShipperConnectionAwsValidator = z.object({
  /** Connection string to AWS */
  url: z.string(),
});

/** Basic auth for ElasticSearch connection */
export const LogShipperConnectionBasicValidator = z.object({
  url: z.string(),
  username: z.string(),
  password: z.string(),
});

export const LogShipperConnectionValidator = z.union([
  LogShipperConnectionBasicValidator,
  LogShipperConnectionCloudValidator,
  LogShipperConnectionAwsValidator,
]);

export const ConnectionValidator = {
  Cloud: LogShipperConnectionCloudValidator,
  Aws: LogShipperConnectionAwsValidator,
  Basic: LogShipperConnectionBasicValidator,
};

/**
 * Elastic index pattern to use, in days
 * @example
 *  - daily will create a new index pattern every day (UTC)
 *  - 7 will create a index every 7 days
 */
export const LogShipperConfigIndexDateValidator = z.union([
  z.literal('daily'),
  z.literal('weekly'),
  z.literal('monthly'),
  z.literal('yearly'),
  z.number(),
]);

export const LogShipperConfigGroupValidator = z.object({
  /**
   * Glob filtering for log groups
   * @example `/aws/lambda/*`
   */
  filter: z.string(),
  /** Additional tags that should be applied to this log group */
  tags: z.array(z.string()).optional(),
  /** Should the logs for this group be dropped */
  drop: z.boolean().optional(),
  /** Index pattern prefix */
  prefix: z.string().optional(),
  /** Drop keys from the log line before inserting into elastic */
  dropKeys: z.array(z.string()).optional(),
  /**
   * How should this log group be indexed daily or monthly
   * @default parent.index
   */
  index: LogShipperConfigIndexDateValidator.optional(),
});

export const LogShipperConfigAccountValidator = z.object({
  /** SSM parameter name for the elastic account configuration */
  elastic: z.string(),
  /** AWS AccountId */
  id: z.string(),
  /**
   * Human readable name of the account
   * @example `linz-step-search-nonprod`
   */
  name: z.string(),
  /** Is this a production log line */
  production: z.boolean().optional(),
  /* Additional tags that should be applied to all log groups */
  tags: z.array(z.string()).optional(),
  /** Should the logs for this group be dropped */
  drop: z.boolean().optional(),
  /** Index pattern prefix */
  prefix: z.string(),
  /**
   * Default index pattern to use
   * @default parent.index
   */
  index: LogShipperConfigIndexDateValidator,
  /** Configuration for log groups inside this account */
  logGroups: z.array(LogShipperConfigGroupValidator),
});
