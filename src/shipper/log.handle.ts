import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
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

export async function processCloudWatchData(
  logShipper: LogShipper,
  c: CloudWatchLogsDecodedData,
  Logger: typeof Log,
  source?: string,
): Promise<void> {
  if (c.logEvents.length === 0) return;
  const accountId = c.owner;
  const logger = Logger.child({
    account: accountId,
    logCount: c.logEvents.length,
    source,
    logGroup: c.logGroup,
    logStream: c.logStream,
  });

  const accounts = logShipper.getAccounts(accountId);
  if (accounts.length === 0) return logger.warn('Account:Skipped');
  for (const account of accounts) {
    if (account.drop) {
      logger.info({ configName: account.name, logCount: c.logEvents.length, logDropped: true }, 'Account:Dropped');
      continue;
    }

    const streamConfig = logShipper.getLogConfig(account, c.logGroup);
    if (streamConfig == null) {
      logger.warn({ configName: account.name, logCount: c.logEvents.length }, 'LogGroup:Skipped');
      continue;
    }

    if (streamConfig.drop) {
      logger.info({ configName: account.name, logCount: c.logEvents.length, logDropped: true }, 'LogGroup:Dropped');
      continue;
    }

    // Find the appropriate config
    // Uses logGroup, then account, then global config for all options
    const streamTags = (account.tags ?? []).concat(streamConfig.tags ?? []);
    const prefix = streamConfig.prefix ?? account.prefix;
    const index = streamConfig.index ?? account.index;

    let logCount = 0;
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

      logCount++;
      logShipper.getElastic(account).queue(logObject, prefix, index);
    }
    logger.info({ configName: account.name, logCount }, 'LogGroup:Processed');
  }
}
