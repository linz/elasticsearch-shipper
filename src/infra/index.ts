import { Construct, Duration } from '@aws-cdk/core';
import * as ssm from '@aws-cdk/aws-ssm';
import { RetentionDays } from '@aws-cdk/aws-logs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import { IVpc } from '@aws-cdk/aws-ec2';
import { Env, DefaultConfigRefreshTimeoutSeconds } from '../env';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as path from 'path';

export const SourceCode = path.join(__dirname, '..', '..', '..', 'dist');

export interface LambdaShipperProps {
  /** VPC to run the lambda function in */
  vpc: IVpc;

  /** Parameter to read configuration from */
  configParameter: ssm.IStringParameter;

  /**
   * Duration before configuration is refreshed
   *
   * @default 300
   */
  refreshDurationSeconds?: number | string;
}

export class LambdaLogShipperFunction extends Construct {
  public lambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaShipperProps) {
    super(scope, id);

    this.lambda = new lambda.Function(this, 'Shipper', {
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: 256,
      vpc: props.vpc,
      timeout: Duration.seconds(30),
      handler: 'index.handler',
      code: lambda.Code.asset(SourceCode),
      environment: {
        [Env.ConfigName]: props.configParameter.parameterName,
        [Env.ConfigRefreshTimeoutSeconds]: String(props.refreshDurationSeconds ?? DefaultConfigRefreshTimeoutSeconds),
      },
      logRetention: RetentionDays.ONE_MONTH,
    });

    props.configParameter.grantRead(this.lambda);
  }

  /** Add a listener to files created in bucket */
  addS3Source(bucket: s3.Bucket): void {
    this.lambda.addEventSource(new S3EventSource(bucket, { events: [s3.EventType.OBJECT_CREATED] }));
    bucket.grantRead(this.lambda);
  }
}
