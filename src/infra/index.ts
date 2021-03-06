import { IVpc } from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import { LambdaDestination } from '@aws-cdk/aws-s3-notifications';
import { RetentionDays } from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as ssm from '@aws-cdk/aws-ssm';
import { Construct, Duration } from '@aws-cdk/core';
import { execFileSync } from 'child_process';
import * as path from 'path';
import { LogShipperConfigAccount } from '../config/config';
import { LogShipperConfigAccountValidator } from '../config/config.elastic';
import { DefaultConfigRefreshTimeoutSeconds, DefaultExecutionTimeoutSeconds, Env } from '../env';
import { LogFunctionName, LogProcessFunction } from '../shipper/type';

export const SourceCode = path.resolve(__dirname, '..', '..', '..', 'dist');
export const SourceCodeExtension = path.join(SourceCode, LogFunctionName);

export interface LambdaShipperConfig {
  name: string;
  accounts: LogShipperConfigAccount[];
}

export interface LambdaShipperProps {
  /** VPC to run the lambda function in */
  vpc?: IVpc;

  /** Configuration objects */
  config: LambdaShipperConfig[] | LambdaShipperConfig;

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

    const elasticIds = new Set<string>();

    const allParameters: ssm.IStringParameter[] = [];
    const ssmList: string[] = [];

    const configs = Array.isArray(props.config) ? props.config : [props.config];
    // Load all configs into SSM and validate that they are valid configs
    for (const config of configs) {
      const parameterName = `/es-shipper-config/account-${config.name.toLowerCase()}`;
      for (const cfg of config.accounts) {
        const validation = LogShipperConfigAccountValidator.safeParse(cfg);
        if (validation.success === false) throw new Error(`Failed to validate ${parameterName}`);

        elasticIds.add(validation.data.elastic);
      }
      const accountParam = new ssm.StringParameter(this, 'Config' + config.name, {
        parameterName,
        stringValue: JSON.stringify(config.accounts),
      });
      ssmList.push(parameterName);
      allParameters.push(accountParam);
    }

    // Validate all the connection references are valid
    for (const elasticId of elasticIds) {
      allParameters.push(ssm.StringParameter.fromStringParameterName(this, 'ElasticConfig' + elasticId, elasticId));
    }

    const configParameter = new ssm.StringParameter(this, 'ShipperConfig', {
      parameterName: `/es-shipper-config/config`,
      stringValue: JSON.stringify(ssmList),
    });
    allParameters.push(configParameter);

    this.lambda = new lambda.Function(this, 'Shipper', {
      memorySize: props.memorySize ?? 256,
      runtime: lambda.Runtime.NODEJS_14_X,
      vpc: props.vpc,
      handler: 'index.handler',
      timeout,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../dist')),
      environment: {
        [Env.ConfigName]: configParameter.parameterName,
        [Env.ConfigRefreshTimeoutSeconds]: String(props.refreshDurationSeconds ?? DefaultConfigRefreshTimeoutSeconds),
        [Env.GitHash]: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
        [Env.GitVersion]: execFileSync('git', ['describe', '--tags', '--always', '--match', 'v*']).toString().trim(),
      },
      logRetention: RetentionDays.ONE_MONTH,
    });

    for (const param of allParameters) param.grantRead(this.lambda);
  }

  /** Add a listener to files created in bucket */
  addS3Source(bucket: s3.IBucket): void {
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new LambdaDestination(this.lambda));
    bucket.grantRead(this.lambda);
  }
}
