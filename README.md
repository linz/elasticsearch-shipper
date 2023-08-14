# Elastic Log Shipper

[![Build Status](https://github.com/linz/elasticsearch-shipper/workflows/Build/badge.svg)](https://github.com/linz/elasticsearch-shipper/actions)

Lambda function to ship logs from various AWS sources into a elastic search instance of your choosing.

## Usage

This package exposes a Lambda Function that can be used in a CDK stack that can be used to configure logs to be automatically shipped into an elastic search of your choosing

`./src/config.mjs`

```typescript
export const Config = {
  name: 'default',
  accounts: [
    {
      id: '1234567890',
      elastic: '/es-shipper-config/elastic-default',
      name: 'linz',
      tags: ['hello'],
      prefix: 'account-prefix',
      logGroups: [
        {
          filter: '**',
          prefix: 'lg-prefix',
        },
      ],
    },
  ],
};
```

`./src/index.mjs`

```typescript
import { Config } from './config.js';
import { logHandler, LogShipper } from '@linzjs/cdk-elastic-shipper';
LogShipper.configure(Config);

export const handler = logHandler;
```

```javascript
import * as cdk from 'aws-cdk-lib';
import { App, CfnOutput, Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lNjs from 'aws-cdk-lib/aws-lambda-nodejs'
import {Config} from './config.mjs'
import {Env} from '@linzjs/cdk-elastic-shipper';

export class YourStack extends cdk.Stack {

  public constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'Vpc');

    const cfg = validateConfig(Config)
    // Validate all the connection references are valid
    const allParameters: ssm.IStringParameter[] = [];
    for (const elasticId of elasticIds) {
      allParameters.push(ssm.StringParameter.fromStringParameterName(this, 'ElasticConfig' + elasticId, elasticId));
    }

    this.lambda = new NodejsFunction(this, 'Shipper', {
        runtime: lambda.Runtime.NODEJS_16_X,
        memorySize: 256,
        timeout: Duration.seconds(30),
        handler: 'handler',
        entry: './src/index.mjs',
        environment: {
          // Deploy with a known hash and version
          [Env.GitHash]: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(),
          [Env.GitVersion]: execFileSync('git', ['describe', '--tags', '--always', '--match', 'v*']).toString().trim(),
        },
        logRetention: RetentionDays.ONE_MONTH,
    });

    for (const param of allParameters) param.grantRead(this.lambda);


    /** Register a listener on a bucket, so when files are added they are to submitted to the log shipper */
    const logBucket = new Bucket.fromName(this, 'LogBucket');
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new LambdaDestination(this.lambda));
    bucket.grantRead(this.lambda);
  }
}
```

The elastic connection strings need to be stored inside of SSM before running the deployment, there are three options for elasticsearch connections

1. AWS

```
{ url: 'https://node-name.eu-west-1.es.amazonaws.com' }
```

2. ElasticCloud

```
{
  id: 'cloud:abc123',
  username: 'foo',
  password: 'bar'
}
```

3. Http

```
{
  url: 'https://fake.com'
  username: 'foo'
  password: 'bar'
}
```

## Building

This repository requires [NodeJs](https://nodejs.org/en/) > 12 & [Yarn](https://yarnpkg.com/en/)

Use [n](https://github.com/tj/n) to manage nodeJs versions

```bash
# Download the latest nodejs & yarn
n latest
npm install -g yarn

# Install node deps
yarn

# Build everything into /build
yarn run build

# Run the unit tests
yarn run test
```
