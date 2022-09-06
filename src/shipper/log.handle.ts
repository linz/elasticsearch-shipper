import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
import { LambdaRequest } from '@linzjs/lambda';
import { LogShipper } from './shipper.config.js';
import { LogStats } from './stats.js';
import { LogShipperContext } from '../config/config.js';

export type RequestEvents = S3Event | CloudWatchLogsEvent;

export type LogRequest<T = RequestEvents> = LambdaRequest<T> & { shipper: LogShipper; stats: LogStats };

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

export function isCloudWatchEvent(req: LambdaRequest<any>): req is LambdaRequest<CloudWatchLogsEvent> {
  return 'awslogs' in req.event;
}
export function isS3Event(req: LambdaRequest<any>): req is LambdaRequest<S3Event> {
  return 'Records' in req.event;
}

export async function processCloudWatchData(
  req: LogRequest,
  c: CloudWatchLogsDecodedData,
  source?: string,
): Promise<void> {
  if (c.logEvents.length === 0) return;
  const logCount = c.logEvents.length;

  const accountId = c.owner;
  const logger = req.log.child({
    account: accountId,
    logCount,
    logGroup: c.logGroup,
    logStream: c.logStream,
  });

  const accounts = req.shipper.getAccounts(accountId);
  if (accounts.length === 0) {
    logger.trace('Account:Skipped');
    return;
  }

  for (const account of accounts) {
    const accountStat = req.stats.account(account.id);
    accountStat.total += logCount;

    if (account.drop) {
      logger.trace({ configName: account.name }, 'Account:Dropped');
      accountStat.dropped += logCount;
      continue;
    }

    const streamConfig = req.shipper.getLogConfig(account, c.logGroup);
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
      const logObject = req.shipper.getLogObject(c, logLine, source);
      if (logObject == null) continue;
      if (streamTags.length > 0) logObject['@tags'] = streamTags.concat(logObject['@tags'] ?? []);

      // Trim out empty tags
      if (logObject['@tags']?.length === 0) delete logObject['@tags'];

      // Remove any keys that should be dropped
      if (Array.isArray(streamConfig.dropKeys)) {
        for (const key of streamConfig.dropKeys) delete logObject[key];
      }

      const logCtx: LogShipperContext = { log: logObject, original: logLine, prefix, indexDate: index };
      if (account.transform) {
        if (account.transform(logCtx) === true) continue;
      }

      req.shipper.getElastic(account).queue(logCtx);
    }
    accountStat.shipped += logCount;
    logger.debug({ configName: account.name }, 'LogGroup:Processed');
  }
}
