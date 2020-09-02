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

export async function processCloudWatchData(
  logShipper: LogShipper,
  c: CloudWatchLogsDecodedData,
  logger: typeof Log,
  source?: string,
): Promise<void> {
  if (c.logEvents.length == 0) return;
  const accountId = c.owner;
  const logInfo: Record<string, unknown> = {
    account: accountId,
    logCount: c.logEvents.length,
    source,
    logGroup: c.logGroup,
    logStream: c.logStream,
  };

  const account = logShipper.getAccount(accountId);
  if (account == null) return logger.warn(logInfo, 'Account:Skipped');
  if (account.drop) return logger.info(logInfo, 'Account:Dropped');

  const streamConfig = logShipper.getLogConfig(account, c.logGroup);
  if (streamConfig == null) return logger.warn(logInfo, 'LogGroup:Skipped');
  if (streamConfig.drop) return logger.info(logInfo, 'LogGroup:Dropped');

  logger.info(logInfo, 'ProcessEvents');

  // Find the appropriate config
  // Uses logGroup, then account, then global config for all options
  const streamTags = (logShipper.config.tags ?? []).concat(account.tags ?? []).concat(streamConfig.tags ?? []);
  const prefix = streamConfig.prefix ?? account.prefix ?? logShipper.config.prefix;
  const index = streamConfig.index ?? account.index ?? logShipper.config.index;

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

    logShipper.es.queue(logObject, prefix, index);
  }
}
