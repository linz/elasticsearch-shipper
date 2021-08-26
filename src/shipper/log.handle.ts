import { CloudWatchLogsDecodedData, CloudWatchLogsEvent } from 'aws-lambda';
import { Log } from '../logger';
import { LogShipper } from './shipper.config';

export interface S3Location {
  Key: string;
  Bucket: string;
}

export interface LogInput {
  message: string;
}

export function splitJsonString(str: string): string[] {
  return str.split(/(?<=})(?={)/);
}

export function s3ToString(loc: S3Location): string {
  return `s3://${loc.Bucket}/${loc.Key}`;
}

export function isCloudWatchEvent(e: any): e is CloudWatchLogsEvent {
  return e['awslogs'] != null;
}

export type LogStats = Record<string, { total: number; skipped: 0; dropped: 0; shipped: 0 }>;

export async function processCloudWatchData(
  logShipper: LogShipper,
  c: CloudWatchLogsDecodedData,
  Logger: typeof Log,
  source?: string,
): Promise<LogStats> {
  if (c.logEvents.length === 0) return {};
  const accountId = c.owner;
  const logger = Logger.child({
    account: accountId,
    logCount: c.logEvents.length,
    source,
    logGroup: c.logGroup,
    logStream: c.logStream,
  });

  const accounts = logShipper.getAccounts(accountId);
  if (accounts.length === 0) {
    logger.warn('Account:Skipped');
    return {};
  }

  const stats: LogStats = {};
  for (const account of accounts) {
    let accountStat = stats[account.id];
    if (accountStat == null) {
      accountStat = { total: 0, skipped: 0, dropped: 0, shipped: 0 };
      stats[accountId] = accountStat;
    }

    const logCount = c.logEvents.length;
    accountStat.total += logCount;

    if (account.drop) {
      logger.info({ configName: account.name }, 'Account:Dropped');
      accountStat.dropped += logCount;
      continue;
    }

    const streamConfig = logShipper.getLogConfig(account, c.logGroup);
    if (streamConfig == null) {
      logger.warn({ configName: account.name }, 'LogGroup:Skipped');
      accountStat.skipped += logCount;

      continue;
    }

    if (streamConfig.drop) {
      logger.info({ configName: account.name }, 'LogGroup:Dropped');
      accountStat.dropped += logCount;
      continue;
    }

    // Find the appropriate config
    // Uses logGroup, then account, then global config for all options
    const streamTags = (account.tags ?? []).concat(streamConfig.tags ?? []);
    const prefix = streamConfig.prefix ?? account.prefix;
    const index = streamConfig.index ?? account.index;

    for (const logLine of c.logEvents) {
      const logObject = logShipper.getLogObject(c, logLine, source);
      if (logObject == null) continue;
      if (streamTags.length > 0) logObject['@tags'] = streamTags.concat(logObject['@tags'] ?? []);

      // Trim out empty tags
      if (logObject['@tags']?.length === 0) delete logObject['@tags'];

      // Remove any keys that should be dropped
      if (Array.isArray(streamConfig.dropKeys)) {
        for (const key of streamConfig.dropKeys) delete logObject[key];
      }

      logShipper.getElastic(account).queue(logObject, prefix, index);
    }
    accountStat.shipped += logCount;
    logger.info({ configName: account.name }, 'LogGroup:Processed');
  }

  return stats;
}
