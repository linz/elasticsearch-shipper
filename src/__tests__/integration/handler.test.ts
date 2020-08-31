import { S3EventRecord } from 'aws-lambda';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { handler } from '../../shipper/app';
import { LogShipperConfig } from '../../config/config';
import { LogShipper } from '../../shipper/shipper.config';
import { LogObject } from '../../shipper/type';
import { Log } from '../../logger';
import { EVENT_DATA, EVENT_DATA_ACCOUNT } from '../event.data';
import { getCloudWatchEvent, LOG_DATA, toLogStream } from '../log.data';
import { ElasticSearchIndex, ElasticSearch } from '../../shipper/elastic';
import { S3 } from '../../shipper/app';

Log.level = 'silent';

describe('HandlerIntegration', () => {
  let s3Stub: sinon.SinonStub;
  const sandbox = sinon.createSandbox();
  let fakeConfig: LogShipperConfig;

  beforeEach(async () => {
    fakeConfig = {
      accounts: [
        {
          id: EVENT_DATA_ACCOUNT,
          name: 'Fake',
          tags: ['@account'],
          prefix: '@account',
          index: 'weekly',
          logGroups: [{ filter: '**', tags: ['@logGroup'], prefix: '@logGroup', index: 'daily' }],
        },
      ],
      elastic: { url: '' },
      tags: ['@config'],
      prefix: '@config',
      index: 'monthly',
    } as LogShipperConfig;
    sandbox.stub(LogShipper, 'parameterStoreConfig').resolves(fakeConfig);
    sandbox.stub(ElasticSearch.prototype, 'save').resolves([]);

    const s3Return = { promise: () => Promise.resolve({ Body: toLogStream() }) } as any;
    s3Stub = sandbox.stub(S3, 'getObject') as any;
    s3Stub.returns(s3Return);
  });

  afterEach(() => {
    LogShipper.INSTANCE = null;
    sandbox.restore();
  });

  function getLog(index: number): LogObject {
    const bodyIndex = index * 2 + 1;
    return LogShipper.INSTANCE?.es.body[bodyIndex] as LogObject;
  }

  function validateItems(): void {
    const firstLog = getLog(0);
    expect(firstLog['@id']).to.equal('35055956108947449057450672217285886913339043275993776128');
    expect(firstLog['@timestamp']).to.equal('2019-10-25T00:30:38.749Z');
    expect(firstLog['@owner']).to.equal(EVENT_DATA_ACCOUNT);
    expect(firstLog['@logGroup']).to.equal('/aws/lambda/s3-log-shipper-ShipFunction-Z4RRMMK7H598');
    expect(firstLog['@logStream']).to.equal('2019/10/25/[$LATEST]a9e13cd4bf854f0d918e5a7a93c89a33');
    expect(firstLog['@tags']).to.include('@config');
    expect(firstLog['@tags']).to.include('@logGroup');
    expect(firstLog['@tags']).to.include('Lambda log');

    // Should extract keys from JSON log lines
    const secondLog = getLog(1);
    expect(secondLog['level']).to.equal(30);
    expect(secondLog['pid']).to.equal(375);
    expect(secondLog['msg']).to.equal('ProcessEvents');
  }

  it('should process s3 test data', async () => {
    await handler({ Records: [EVENT_DATA] });

    expect(s3Stub.callCount).to.equal(1);
    const firstS3Call = s3Stub.args[0];
    expect(firstS3Call[0]).to.deep.equal({ Key: EVENT_DATA.s3.object.key, Bucket: EVENT_DATA.s3.bucket.name });
    // expect(instance.body.length).to.equal(6);

    validateItems();

    // Source is only set on s3 test data
    const firstLog = getLog(0);
    expect(firstLog['@source']).to.equal(
      '111111111111/222222222222/2019/10/13/22/Centralized-Logging-Delivery-Stream-222222222222-1-2019-10-13-22-02-27-c964ea97-8f7e-46d4-8539-5998f4d9f603',
    );
  });

  it('should process cloudwatch data', async () => {
    await handler(getCloudWatchEvent());

    expect(s3Stub.callCount).to.equal(0);

    const firstLog = getLog(0);
    expect(firstLog['@source']).to.equal(undefined);
  });

  it('should drop unknown accounts', async () => {
    const newLogData = JSON.parse(JSON.stringify(LOG_DATA[1]));
    newLogData.owner = 'foo';

    const newEventData: S3EventRecord = JSON.parse(JSON.stringify(EVENT_DATA));
    newEventData.s3.object.key = 'abc123';
    s3Stub.returns({ promise: () => Promise.resolve({ Body: toLogStream([newLogData]) }) } as any);

    await handler(getCloudWatchEvent(newLogData));
    await handler({ Records: [newEventData] });

    expect(s3Stub.callCount).to.equal(1);

    const firstLog = getLog(0);
    expect(firstLog).to.eq(undefined);
  });

  it('should drop by account when told to', async () => {
    fakeConfig.accounts[0].drop = true;
    await handler(getCloudWatchEvent());
    await handler({ Records: [EVENT_DATA] });

    expect(s3Stub.callCount).to.equal(1);

    const firstLog = getLog(0);
    expect(firstLog).to.eq(undefined);
  });

  it('should error if the config is invalid', async () => {
    delete (fakeConfig as any).accounts;
    try {
      await handler({ Records: [EVENT_DATA] });
      expect(true).eq(false);
    } catch (e) {
      expect(e.message).contains('Issue #0: invalid_type at accounts');
    }
  });

  it('should use the index prefixes in order', async () => {
    await handler({ Records: [EVENT_DATA] });
    const shipper = LogShipper.INSTANCE!;
    let indexInsert = (shipper.es.body[0].index as ElasticSearchIndex)._index;
    let firstLog = getLog(0);
    expect(indexInsert).eq('@logGroup-111111111111-2019-10-25'); // Daily index with @logGroup prefix
    expect(firstLog['@tags']).deep.eq(['@config', '@account', '@logGroup', 'Lambda log']);

    // Remove the log group specifics
    shipper.es.body = [];
    delete fakeConfig.accounts[0].logGroups[0].index;
    delete fakeConfig.accounts[0].logGroups[0].tags;
    delete fakeConfig.accounts[0].logGroups[0].prefix;

    await handler({ Records: [EVENT_DATA] });
    indexInsert = (shipper.es.body[0].index as ElasticSearchIndex)._index;
    firstLog = getLog(0);
    expect(indexInsert).eq('@account-111111111111-2019-10-24'); // Weekly index with @account prefix
    expect(firstLog['@tags']).deep.eq(['@config', '@account', 'Lambda log']);

    // Remove the account specifics
    shipper.es.body = [];
    delete fakeConfig.accounts[0].index;
    delete fakeConfig.accounts[0].tags;
    delete fakeConfig.accounts[0].prefix;

    await handler({ Records: [EVENT_DATA] });
    indexInsert = (shipper.es.body[0].index as ElasticSearchIndex)._index;
    firstLog = getLog(0);
    expect(indexInsert).eq('@config-111111111111-2019-10'); // Monthly index with @config prefix
    expect(firstLog['@tags']).deep.eq(['@config', 'Lambda log']);
  });
});
