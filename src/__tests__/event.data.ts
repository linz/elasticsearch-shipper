import { S3EventRecord } from 'aws-lambda';

export const EVENT_DATA_ACCOUNT = '111111111111';
export const EVENT_BUCKET_NAME = `cloudwatch-${EVENT_DATA_ACCOUNT}-archive`;

export const EVENT_DATA: S3EventRecord = {
  eventVersion: '2.0',
  eventSource: 'aws:s3',
  awsRegion: 'ap-southeast-2',
  eventTime: '1970-01-01T00:00:00.000Z',
  eventName: 'ObjectCreated:Put',
  userIdentity: {
    principalId: 'EXAMPLE',
  },
  requestParameters: {
    sourceIPAddress: '127.0.0.1',
  },
  responseElements: {
    'x-amz-request-id': 'EXAMPLE123456789',
    'x-amz-id-2': 'EXAMPLE123/5678abcdefghijklambdaisawesome/mnopqrstuvwxyzABCDEFGH',
  },
  s3: {
    s3SchemaVersion: '1.0',
    configurationId: 'testConfigRule',
    bucket: {
      name: EVENT_BUCKET_NAME,
      ownerIdentity: {
        principalId: 'EXAMPLE',
      },
      arn: `arn:aws:s3:::${EVENT_BUCKET_NAME}`,
    },
    object: {
      key: `${EVENT_DATA_ACCOUNT}/222222222222/2019/10/13/22/Centralized-Logging-Delivery-Stream-222222222222-1-2019-10-13-22-02-27-c964ea97-8f7e-46d4-8539-5998f4d9f603`,
      size: 1024,
      eTag: '0123456789abcdef0123456789abcdef',
      sequencer: '0A1B2C3D4E5F678901',
    },
  },
};
