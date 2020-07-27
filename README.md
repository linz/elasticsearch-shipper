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
    /** 
     * The configuration for the shipper is stored inside ssm, 
     * you need to configure this parameter before deploying
     */ 
    const configParameter = ssm.StringParameter.fromStringParameterName(this, 'ConfigParam', configName);
    this.logShipper = new LambdaLogShipperFunction(this, 'LogShipper', { configParameter, vpc });

    /** Register a listener on a bucket, so when files are added they are to submitted to the log shipper*/
    const logBucket = new s3.Bucket(this, 'LogBucket');
    this.logShipper.addS3Source(logBucket);
  }
}

```

## Configure

The log shipper's configuration is stored inside of AWS's parameter store, to configure how the log shipper connects to elastic search and what index patterns to use a simple json config file is used.

[./config.example.json](./config.example.json)

```javascript
{
  "elastic": { "url": "https://" },
  "prefix": "centralised-logging",
  "index": "monthly",
  "accounts": [
    {
      "id": "1234567890",
      "name": "linz",
      "tags": ["hello"],
      "prefix": "account-prefix",
      "logGroups": [
        {
          "filter": "**",
          "prefix": "lg-prefix"
        }
      ]
    }
  ]
}
```

to configure the parameter store the config cli can be used, this will update teh configuration inside of `$AWS_PROFILE`

```bash
./lls-config --import config.json --commit
```

to update an existing configuration

```bash
./lls-config --export config.json 
# Make Changes
./lls-config --import config.json --commit
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
