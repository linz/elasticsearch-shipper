import { IVpc } from '@aws-cdk/aws-ec2';
import * as lambda from '@aws-cdk/aws-lambda';
import { RetentionDays } from '@aws-cdk/aws-logs';
import * as s3 from '@aws-cdk/aws-s3';
import * as assets from '@aws-cdk/aws-s3-assets';
import { LambdaDestination } from '@aws-cdk/aws-s3-notifications';
import * as ssm from '@aws-cdk/aws-ssm';
import { Construct, Duration } from '@aws-cdk/core';
import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
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

// force a asset path
const targetPath = './build/assets';
mkdirSync(targetPath, { recursive: true });

export class LambdaLogShipperFunction extends Construct {
  public lambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaShipperProps) {
    super(scope, id);

    const timeout = Duration.seconds(Number(props.executionTimeoutSeconds ?? DefaultExecutionTimeoutSeconds));

    const elasticIds = new Set<string>();
    const configs = Array.isArray(props.config) ? props.config : [props.config];
    const accounts: LogShipperConfigAccount[] = [];

    // Load all configs into S3 and validate that they are valid configs
    for (const config of configs) {
      for (const cfg of config.accounts) {
        const validation = LogShipperConfigAccountValidator.safeParse(cfg);
        if (validation.success === false) throw new Error(`Failed to validate ${config.name}:${cfg.name}`);
        elasticIds.add(validation.data.elastic);
        accounts.push(cfg);
      }
    }

    const configData = JSON.stringify(accounts);
    const parameterHash = createHash('sha256').update(configData).digest('hex');
    const configJsonPath = path.join(targetPath, parameterHash) + '.json';
    writeFileSync(configJsonPath, configData);
    const asset = new assets.Asset(this, 'ShipperS3Config', { path: configJsonPath });

    // Validate all the connection references are valid
    const allParameters: ssm.IStringParameter[] = [];
    for (const elasticId of elasticIds) {
      allParameters.push(ssm.StringParameter.fromStringParameterName(this, 'ElasticConfig' + elasticId, elasticId));
    }

    this.lambda = new lambda.Function(this, 'Shipper', {
      memorySize: props.memorySize ?? 256,
      runtime: lambda.Runtime.NODEJS_14_X,
      vpc: props.vpc,
      handler: 'index.handler',
      timeout,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../dist')),
      environment: {
        [Env.ConfigUri]: asset.s3ObjectUrl,
        [Env.ConfigRefreshTimeoutSeconds]: String(props.refreshDurationSeconds ?? DefaultConfigRefreshTimeoutSeconds),
        [Env.GitHash]: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
        [Env.GitVersion]: execFileSync('git', ['describe', '--tags', '--always', '--match', 'v*']).toString().trim(),
      },
      logRetention: RetentionDays.ONE_MONTH,
    });

    for (const param of allParameters) param.grantRead(this.lambda);
    asset.grantRead(this.lambda);
  }

  /** Add a listener to files created in bucket */
  addS3Source(bucket: s3.IBucket): void {
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new LambdaDestination(this.lambda));
    bucket.grantRead(this.lambda);
  }
}
