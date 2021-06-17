import { IVpc } from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import { S3EventSource } from '@aws-cdk/aws-lambda-event-sources';
import { RetentionDays } from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as ssm from '@aws-cdk/aws-ssm';
import { Construct, Duration } from '@aws-cdk/core';
import * as path from 'path';
import { DefaultConfigRefreshTimeoutSeconds, DefaultExecutionTimeoutSeconds, Env } from '../env';
import { LogFunctionName, LogProcessFunction } from '../shipper/type';

export const SourceCode = path.resolve(__dirname, '..', '..', '..', 'dist');
export const SourceCodeExtension = path.join(SourceCode, LogFunctionName);

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

  /**
   * Time in seconds the execution can run for
   * @default 30
   */
  executionTimeoutSeconds?: number | string;

  /**
   * Memory for the function to use
   *
   * @default 256
   */
  memorySize?: number;

  /** Additional log processing function */
  onLog?: LogProcessFunction;
}

export class LambdaLogShipperFunction extends Construct {
  public lambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaShipperProps) {
    super(scope, id);

    const timeout = Duration.seconds(Number(props.executionTimeoutSeconds ?? DefaultExecutionTimeoutSeconds));

    this.lambda = new lambda.Function(this, 'Shipper', {
      runtime: lambda.Runtime.NODEJS_12_X,
      memorySize: props.memorySize ?? 256,
      vpc: props.vpc,
      timeout,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(SourceCode),
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
