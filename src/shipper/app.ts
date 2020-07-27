import 'source-map-support/register';

// Source map support must come first
import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
import * as util from 'util';
import * as AWS from 'aws-sdk';
import * as zlib from 'zlib';
import { LogShipper } from './shipper.config';
import { logger } from '../logger';
import { processCloudWatchData, splitJsonString, isCloudWatchEvent, s3ToString } from './log.handle';

export const S3 = new AWS.S3({ region: process.env.AWS_DEFAULT_REGION ?? 'ap-southeast-2' });

const gunzip: (buf: Buffer) => Promise<Buffer> = util.promisify(zlib.gunzip);

export async function handler(event: S3Event | CloudWatchLogsEvent): Promise<void> {
  const logShipper = await LogShipper.load();

  if (isCloudWatchEvent(event)) {
    /** Is this data being supplied directly by a cloudwatch -> lambda invocation */
    logger.info('Process:CloudWatch');
    const zippedInput = Buffer.from(event.awslogs.data, 'base64');
    const buffer = await gunzip(zippedInput);
    const awsLogsData: CloudWatchLogsDecodedData = JSON.parse(buffer.toString('utf8'));

    await processCloudWatchData(logShipper, awsLogsData);
    return;
  }

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
      if (line == null || line == '') continue;

      const obj: CloudWatchLogsDecodedData = JSON.parse(line);
      await processCloudWatchData(logShipper, obj, params.Key);
    }
  }
}
