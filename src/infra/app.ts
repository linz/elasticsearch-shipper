import * as ec2 from '@aws-cdk/aws-ec2';
import * as s3 from '@aws-cdk/aws-s3';
import { BlockPublicAccess } from '@aws-cdk/aws-s3';
import { StringParameter } from '@aws-cdk/aws-ssm';
import * as cdk from '@aws-cdk/core';
import { App } from '@aws-cdk/core';
import {
  Env,
  DefaultParameterStoreBasePath,
  DefaultConfigRefreshTimeoutSeconds,
  DefaultExecutionTimeoutSeconds,
} from '../env';
import { LambdaLogShipperFunction } from './index';

/** Using VPC lookups requires a hard coded AWS "account" */
const account = process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;

const BUCKET_NAME = process.env[Env.BucketName];
const CONFIG_NAME = process.env[Env.ConfigName] ?? DefaultParameterStoreBasePath;
const CONFIG_REFRESH_TIMEOUT_SECONDS =
  process.env[Env.ConfigRefreshTimeoutSeconds] ?? DefaultConfigRefreshTimeoutSeconds;
const EXECUTION_TIMEOUT_SECONDS = process.env[Env.ExecutionTimeoutSeconds] ?? DefaultExecutionTimeoutSeconds;

export class LogShipperStack extends cdk.Stack {
  public logShipper: LambdaLogShipperFunction;

  public constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, 'EsVpc', { tags: { 'linz:elasticsearch': 'true' } });

    const configName = CONFIG_NAME;
    const configParameter = StringParameter.fromStringParameterName(this, 'es-shipper-config', configName);

    this.logShipper = new LambdaLogShipperFunction(this, 'Shipper', {
      vpc,
      configParameter,
      refreshDurationSeconds: CONFIG_REFRESH_TIMEOUT_SECONDS,
      executionTimeoutSeconds: EXECUTION_TIMEOUT_SECONDS,
    });

    if (BUCKET_NAME) {
      const bucket = new s3.Bucket(this, 'LogBucket', {
        bucketName: BUCKET_NAME,
        versioned: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      });
      this.logShipper.addS3Source(bucket);
    }

    new cdk.CfnOutput(this, 'LambdaShipper', { value: this.logShipper.lambda.functionArn });
  }
}

const shipper = new App();
new LogShipperStack(shipper, 'LogShipper', { env: { region: 'ap-southeast-2', account } });
