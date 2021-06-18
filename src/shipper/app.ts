import 'source-map-support/register';

// Source map support must come first
import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
import * as util from 'util';
import * as AWS from 'aws-sdk';
import * as zlib from 'zlib';
import { LogShipper } from './shipper.config';
import { Log } from '../logger';
import { ulid } from 'ulid';
import { processCloudWatchData, splitJsonString, isCloudWatchEvent, s3ToString } from './log.handle';
import { Metrics } from '@basemaps/metrics';

export const S3 = new AWS.S3({ region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' });

const gunzip: (buf: Buffer) => Promise<Buffer> = util.promisify(zlib.gunzip);

async function processCloudWatchEvent(
  event: CloudWatchLogsEvent,
  logShipper: LogShipper,
  logger: typeof Log,
): Promise<void> {
  /** Is this data being supplied directly by a cloudwatch -> lambda invocation */
  logger.info('Process:CloudWatch');

  const zippedInput = Buffer.from(event.awslogs.data, 'base64');
  const buffer = await gunzip(zippedInput);
  const awsLogsData: CloudWatchLogsDecodedData = JSON.parse(buffer.toString('utf8'));

  await processCloudWatchData(logShipper, awsLogsData, logger);
}

async function processS3Event(event: S3Event, logShipper: LogShipper, logger: typeof Log): Promise<void> {
  logger.info({ records: event.Records.length }, 'Process:S3');
  for (const record of event.Records) {
    /** Data is supplied from a s3 object creation */
    const params = { Bucket: record.s3.bucket.name, Key: record.s3.object.key };
    const source = s3ToString(params);

    logger.info({ source }, 'ProcessEvent');

    const object = await S3.getObject(params).promise();
    const unzipped = await gunzip(object.Body as Buffer);
    const jsonLines = splitJsonString(unzipped.toString());

    logger.info({ source, lines: jsonLines.length }, 'ProcessingLines');

    for (const line of jsonLines) {
      if (line == null || line === '') continue;

      const obj: CloudWatchLogsDecodedData = JSON.parse(line);
      await processCloudWatchData(logShipper, obj, logger, params.Key);
    }
  }
}

export async function handler(event: S3Event | CloudWatchLogsEvent): Promise<void> {
  const startTime = Date.now();
  const logger = Log.child({ id: ulid() });
  const logShipper = await LogShipper.load(logger);
  const metrics = new Metrics();

  metrics.start('Process');
  if (isCloudWatchEvent(event)) {
    await processCloudWatchEvent(event, logShipper, logger);
  } else {
    await processS3Event(event, logShipper, logger);
  }
  metrics.end('Process');

  if (logShipper.logCount > 0) {
    metrics.start('Elastic:Save');
    await logShipper.save(logger);
    metrics.end('Elastic:Save');
  }

  const duration = Date.now() - startTime;
  logger.info({ '@type': 'report', metrics: metrics.metrics, logCount: logShipper.logCount, duration }, 'ShippingDone');
}
