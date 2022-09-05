import { CloudWatchLogsDecodedData, CloudWatchLogsEvent, S3Event } from 'aws-lambda';
import { gzipSync } from 'zlib';
import { EVENT_DATA_ACCOUNT } from './event.data.js';

export const LOG_DATA: CloudWatchLogsDecodedData[] = [
  {
    messageType: 'DATA_MESSAGE',
    owner: EVENT_DATA_ACCOUNT,
    logGroup:
      'StackSet-AWS-Landing-Zone-Baseline-PrimaryVPC-7cec08f8-f6af-4da4-8910-e5244312afda-VPCFlowLogsLogGroup-59RC8JDAPRSV',
    logStream: 'eni-deadbeefdeadbeefd-all',
    subscriptionFilters: ['Destination'],
    logEvents: [
      {
        id: '35055947907870703043012542183748618652884187642541965312',
        timestamp: 1571963071000,
        message:
          '2 725496895483 eni-deadbeefdeadbeefd 10.112.112.112 10.160.160.160 443 42758 6 5 1956 1571963071 1571963088 ACCEPT OK',
      },
      {
        id: '35055947907870703043012542183748618652884187642541965313',
        timestamp: 1571963071000,
        message:
          '2 725496895483 eni-deadbeefdeadbeefd 10.160.160.160 10.112.112.112 32966 443 6 4 1926 1571963071 1571963088 ACCEPT OK',
      },
    ],
  },
  {
    messageType: 'DATA_MESSAGE',
    owner: EVENT_DATA_ACCOUNT,
    logGroup: '/aws/lambda/s3-log-shipper-ShipFunction-Z4RRMMK7H598',
    logStream: '2019/10/25/[$LATEST]a9e13cd4bf854f0d918e5a7a93c89a33',
    subscriptionFilters: ['Destination'],
    logEvents: [
      {
        id: '35055956108947449057450672217285886913339043275993776128',
        timestamp: 1571963438749,
        message: 'END RequestId: cdc40b22-1195-4b2a-8c61-07e48cab7207\n',
      },
      {
        id: '35055956108947449057450672217285886913339043275993776128',
        timestamp: 1571963438749,
        message:
          'cdc40b22-1195-4b2a-8c61-07e48cab7207 {"level":30,"time":1571963438749,"pid":375,"hostname":"OLUbuntu1","records":0,"msg":"ProcessEvents","v":1}\n',
      },
      {
        id: '35055956108947449057450672217285886913339043275993776129',
        timestamp: 1571963438749,
        message:
          'REPORT RequestId: cdc40b22-1195-4b2a-8c61-07e48cab7207\tDuration: 518.95 ms\tBilled Duration: 600 ms\tMemory Size: 256 MB\tMax Memory Used: 39 MB\tInit Duration: 418.93 ms\t\n',
      },
    ],
  },
];

export function toLogStream(logData = LOG_DATA): Buffer {
  const data = logData.map((c) => JSON.stringify(c)).join('');
  return gzipSync(data);
}

export function getCloudWatchEvent(logData = LOG_DATA[1]): CloudWatchLogsEvent {
  const data = gzipSync(JSON.stringify(logData)).toString('base64');
  return { awslogs: { data } };
}

export function getS3Event(): S3Event {
  return { Records: [{ s3: { bucket: { name: 'log-bucket' }, object: { key: 'log-key' } } }] as any };
}
