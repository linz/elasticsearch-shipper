# Elastic Log Shipper

[![Build Status](https://github.com/linz/elasticsearch-shipper/workflows/Build/badge.svg)](https://github.com/linz/elasticsearch-shipper/actions)


Lambda function to ship logs from various AWS sources into a elastic search instance of your choosing.

## Usage

This package exposes a AWS-CDK construct that can be imported into your CDK stack and can be used to configure logs to be automatically shipped into an elastic search of your choosing

```javascript 
import * as cdk from '@aws-cdk/aws-cdk'
import * as ssm from '@aws-cdk/aws-ssm'
import { LambdaLogShipperFunction } from '@linzjs/cdk-elastic-shipper'

export class YourStack extends cdk.Stack {

  public constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpc = new ec2.Vpc(this, 'Vpc');

    const config = {
      name: 'default',
      accounts: [{
        id: '1234567890',
        elastic: '/es-shipper-config/elastic-default',
        name: 'linz',
        tags: ['hello'],
        prefix: 'account-prefix',
        logGroups: [{
          filter: '**',
          prefix: 'lg-prefix',
        }],
      }],
    };
    this.logShipper = new LambdaLogShipperFunction(this, 'LogShipper', { config, vpc });

    /** Register a listener on a bucket, so when files are added they are to submitted to the log shipper*/
    const logBucket = new s3.Bucket(this, 'LogBucket');
    this.logShipper.addS3Source(logBucket);
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
