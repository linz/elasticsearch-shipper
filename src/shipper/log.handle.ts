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

export type LogStats = Record<string, LogStat>;
export type LogStat = { total: number; skipped: number; dropped: number; shipped: number };

export async function processCloudWatchData(
  logShipper: LogShipper,
  c: CloudWatchLogsDecodedData,
  Logger: typeof Log,
  source?: string,
): Promise<LogStats> {
  if (c.logEvents.length === 0) return {};
  const logCount = c.logEvents.length;

  const accountId = c.owner;
  const logger = Logger.child({
    account: accountId,
    logCount,
    source,
    logGroup: c.logGroup,
    logStream: c.logStream,
  });

  const accounts = logShipper.getAccounts(accountId);
  if (accounts.length === 0) {
    logger.trace('Account:Skipped');
    return { [accountId]: { total: logCount, skipped: 0, dropped: logCount, shipped: 0 } };
  }

  const stats: LogStats = {};
  for (const account of accounts) {
    let accountStat = stats[account.id];
    if (accountStat == null) {
      accountStat = { total: 0, skipped: 0, dropped: 0, shipped: 0 };
      stats[accountId] = accountStat;
    }

    accountStat.total += logCount;

    if (account.drop) {
      logger.trace({ configName: account.name }, 'Account:Dropped');
      accountStat.dropped += logCount;
      continue;
    }

    const streamConfig = logShipper.getLogConfig(account, c.logGroup);
    if (streamConfig == null) {
      logger.trace({ configName: account.name }, 'LogGroup:Skipped');
      accountStat.skipped += logCount;

      continue;
    }

    if (streamConfig.drop) {
      logger.trace({ configName: account.name }, 'LogGroup:Dropped');
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
    logger.debug({ configName: account.name }, 'LogGroup:Processed');
  }

  return stats;
}
