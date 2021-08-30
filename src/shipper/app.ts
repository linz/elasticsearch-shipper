// Source map support must come first
import 'source-map-support/register';
// ---

import { LambdaRequest, lf } from '@linzjs/lambda';
import { fsa, FsS3 } from '@linzjs/s3fs';
import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import SSM from 'aws-sdk/clients/ssm';
import * as util from 'util';
import * as zlib from 'zlib';
import { FsSsm } from './fs.ssm';
import {
  isCloudWatchEvent,
  isS3Event,
  LogRequest,
  processCloudWatchData,
  RequestEvents,
  s3ToString,
  splitJsonString,
} from './log.handle';
import { LogShipper } from './shipper.config';
import { LogStats } from './stats';

const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2';
export const s3 = new S3({ region });
export const ssm = new SSM({ region });

fsa.register('s3://', new FsS3(s3));
fsa.register('ssm://', new FsSsm(ssm));

const gunzip: (buf: Buffer) => Promise<Buffer> = util.promisify(zlib.gunzip);

async function onCloudWatchEvent(req: LogRequest<CloudWatchLogsEvent>): Promise<void> {
  req.set('source', 'cloudwatch');

  const zippedInput = Buffer.from(req.event.awslogs.data, 'base64');
  const buffer = await gunzip(zippedInput);
  const logData: CloudWatchLogsDecodedData = JSON.parse(buffer.toString('utf8'));

  req.set('bytes', buffer.length);
  await processCloudWatchData(req, logData);
}

async function onS3Event(req: LogRequest<S3Event>): Promise<void> {
  const sources: string[] = [];
  req.set('source', 's3');
  req.set('sources', sources);

  let byteCount = 0;
  for (const record of req.event.Records) {
    /** Data is supplied from a s3 object creation */
    const params = { Bucket: record.s3.bucket.name, Key: record.s3.object.key };
    const source = s3ToString(params);
    sources.push(source);

    const object = await s3.getObject(params).promise();
    const unzipped = await gunzip(object.Body as Buffer);
    const jsonLines = splitJsonString(unzipped.toString());
    byteCount += unzipped.length;

    for (const line of jsonLines) {
      if (line == null || line === '') continue;

      const logData: CloudWatchLogsDecodedData = JSON.parse(line);
      await processCloudWatchData(req, logData, record.s3.object.key);
    }
  }

  req.set('bytes', byteCount);
}

/**
 * Trace more information of requests that are taking too long to process
 */
function handleSlowRequest(req: LogRequest<RequestEvents>): void {
  try {
    if (isCloudWatchEvent(req)) {
      req.set('source', 'cloudwatch');
    } else if (isS3Event(req)) {
      req.set('source', 's3');
      // List of source files
      req.set(
        'sourceList',
        req.event.Records.map((c) => `s3://${c.s3.bucket.name}/${c.s3.object.key}`),
      );
      // List of accountIds being used
      req.set(
        'accountIds',
        req.event.Records.map((c) => c.s3.object.key.split('/')[0]),
      );
    }

    if (req.shipper) {
      for (const [key, value] of req.shipper.elastic.entries()) {
        req.set('elastic', { [key]: value.logCount });
      }
    }
  } catch (e) {
    req.set('slowErr', e);
  }

  req.log.warn({ ...req.logContext, metrics: req.stats }, 'SlowRequest');
  console.log('SlowRequests', { ...req.logContext, metrics: req.stats });
}

async function main(baseRequest: LambdaRequest<RequestEvents>): Promise<void> {
  const req = baseRequest as LogRequest<RequestEvents>;
  // Track requests that take longer than 10 seconds and output more logging
  const slowTimer = setTimeout(() => handleSlowRequest(req), 10_000);
  try {
    req.stats = new LogStats();
    req.shipper = await LogShipper.load(baseRequest.log);

    if (isCloudWatchEvent(req)) await onCloudWatchEvent(req);
    else if (isS3Event(req)) await onS3Event(req);
    else throw new Error('Unknown request type');

    req.set('logCount', req.shipper.logCount);
    if (req.shipper.logCount > 0) {
      req.timer.start('elastic:save');
      await req.shipper.save(req.log);
      req.timer.end('elastic:save');
    }

    if (req.stats.accounts.size === 1) {
      const stats = req.stats.accounts.values().next();
      const accountId = req.stats.accounts.keys().next();
      req.set('stats', stats.value);
      req.set('accountId', accountId.value);
    }
  } finally {
    clearTimeout(slowTimer);
  }
}
export const handler = lf.handler(main);
