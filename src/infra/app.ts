import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import { BlockPublicAccess } from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import { App } from '@aws-cdk/core';
import { DefaultConfigRefreshTimeoutSeconds, DefaultExecutionTimeoutSeconds, Env } from '../env';
import { LambdaLogShipperFunction, LambdaShipperConfig } from './index';

/** Using VPC lookups requires a hard coded AWS "account" */
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const BUCKET_NAME = process.env[Env.BucketName];
const CONFIG_REFRESH_TIMEOUT_SECONDS =
  process.env[Env.ConfigRefreshTimeoutSeconds] ?? DefaultConfigRefreshTimeoutSeconds;
const EXECUTION_TIMEOUT_SECONDS = process.env[Env.ExecutionTimeoutSeconds] ?? DefaultExecutionTimeoutSeconds;

const Config: LambdaShipperConfig = {
  name: 'Default',
  accounts: [
    {
      name: 'default',
      elastic: '/es-shipper-config/elastic-default',
      id: '12345',
      index: 7,
      prefix: 'default-prefix',
      logGroups: [{ filter: '**' }],
    },
  ],
};

export class LogShipperStack extends cdk.Stack {
  public logShipper: LambdaLogShipperFunction;

  public constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'EsVpc', { tags: { BaseVPC: 'true' } });

    this.logShipper = new LambdaLogShipperFunction(this, 'Shipper', {
      vpc,
      config: Config,
      refreshDurationSeconds: CONFIG_REFRESH_TIMEOUT_SECONDS,
      executionTimeoutSeconds: EXECUTION_TIMEOUT_SECONDS,
    });

    if (BUCKET_NAME) {
      const bucket = s3.Bucket.fromBucketName(this, 'LogBucket', BUCKET_NAME);
      this.logShipper.addS3Source(bucket);
    }

    new cdk.CfnOutput(this, 'LambdaShipper', { value: this.logShipper.lambda.functionArn });
  }
}

const shipper = new App();
new LogShipperStack(shipper, 'LogShipper', { env: { region: 'ap-southeast-2', account } });
