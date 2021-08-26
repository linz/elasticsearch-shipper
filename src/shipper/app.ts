import 'source-map-support/register';

// Source map support must come first
import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, Context, S3Event } from 'aws-lambda';
import * as util from 'util';
import S3 from 'aws-sdk/clients/s3';
import SSM from 'aws-sdk/clients/ssm';
import * as zlib from 'zlib';
import { LogShipper } from './shipper.config';
import { Log } from '../logger';
import { ulid } from 'ulid';
import { processCloudWatchData, splitJsonString, isCloudWatchEvent, s3ToString, LogStats } from './log.handle';
import { Metrics } from '@basemaps/metrics';
import { fsa, FsS3 } from '@linzjs/s3fs';
import { FsSsm } from './fs.ssm';

export const s3 = new S3({ region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' });
export const ssm = new SSM({ region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' });

fsa.register('s3://', new FsS3(s3));
fsa.register('ssm://', new FsSsm(ssm));

const gunzip: (buf: Buffer) => Promise<Buffer> = util.promisify(zlib.gunzip);

async function processCloudWatchEvent(
  event: CloudWatchLogsEvent,
  logShipper: LogShipper,
  logger: typeof Log,
): Promise<LogStats> {
  /** Is this data being supplied directly by a cloudwatch -> lambda invocation */
  logger.info('Process:CloudWatch');

  const zippedInput = Buffer.from(event.awslogs.data, 'base64');
  const buffer = await gunzip(zippedInput);
  const awsLogsData: CloudWatchLogsDecodedData = JSON.parse(buffer.toString('utf8'));

  return await processCloudWatchData(logShipper, awsLogsData, logger);
}

async function processS3Event(event: S3Event, logShipper: LogShipper, logger: typeof Log): Promise<LogStats> {
  logger.info({ records: event.Records.length }, 'Process:S3');

  const stats: LogStats = {};
  for (const record of event.Records) {
    /** Data is supplied from a s3 object creation */
    const params = { Bucket: record.s3.bucket.name, Key: record.s3.object.key };
    const source = s3ToString(params);

    logger.info({ source }, 'ProcessEvent');

    const object = await s3.getObject(params).promise();
    const unzipped = await gunzip(object.Body as Buffer);
    const jsonLines = splitJsonString(unzipped.toString());

    logger.info({ source, lines: jsonLines.length }, 'ProcessingLines');

    for (const line of jsonLines) {
      if (line == null || line === '') continue;

      const obj: CloudWatchLogsDecodedData = JSON.parse(line);
      const stat = await processCloudWatchData(logShipper, obj, logger, params.Key);
      for (const [accountId, s] of Object.entries(stat)) {
        // Doesnt exist just replace
        const current = stats[accountId];
        if (current == null) {
          stats[accountId] = s;
          break;
        }
        current.total += s.total;
        current.dropped += s.dropped;
        current.shipped += s.shipped;
        current.skipped += s.skipped;
      }
    }
  }
  return stats;
}

export async function handler(event: S3Event | CloudWatchLogsEvent, context?: Context): Promise<void> {
  const startTime = Date.now();
  const logger = Log.child({ id: ulid() });
  const logShipper = await LogShipper.load(logger);
  const metrics = new Metrics();

  metrics.start('Process');
  let accountStats: LogStats | null = null;
  if (isCloudWatchEvent(event)) {
    accountStats = await processCloudWatchEvent(event, logShipper, logger);
  } else {
    accountStats = await processS3Event(event, logShipper, logger);
  }
  metrics.end('Process');

  const logCount = logShipper.logCount;
  if (logCount > 0) {
    metrics.start('Elastic:Save');
    await logShipper.save(logger);
    metrics.end('Elastic:Save');
  }

  const logObject: Record<string, unknown> = {};

  // 99% of all log entries are for one account, this makes it easier to aggregate across
  const sts = Object.entries(accountStats);
  if (sts.length === 1) {
    logObject['accountId'] = sts[0][0];
    logObject['stats'] = sts[0][1];
  } else {
    logObject['accountStats'] = accountStats;
  }

  const duration = Date.now() - startTime;
  logger.info(
    {
      '@type': 'report',
      metrics: metrics.metrics,
      logCount,
      aws: { lambdaId: context?.awsRequestId },
      ...logObject,
      duration,
    },
    'ShippingDone',
  );
}
