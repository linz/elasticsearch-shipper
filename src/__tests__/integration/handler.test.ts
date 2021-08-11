import { S3EventRecord } from 'aws-lambda';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { LogShipperConfigAccount } from '../../config/config';
import { Env } from '../../env';
import { Log } from '../../logger';
import { handler, s3 } from '../../shipper/app';
import { ElasticSearch } from '../../shipper/elastic';
import { LogShipper } from '../../shipper/shipper.config';
import { ConfigCache } from '../../shipper/config';
import { LogObject } from '../../shipper/type';
import { EVENT_DATA, EVENT_DATA_ACCOUNT } from '../event.data';
import { getCloudWatchEvent, LOG_DATA, toLogStream } from '../log.data';

Log.level = 'silent';

describe('HandlerIntegration', () => {
  let s3Stub: sinon.SinonStub;
  const sandbox = sinon.createSandbox();
  let fakeAccount: LogShipperConfigAccount;

  beforeEach(async () => {
    process.env[Env.ConfigUri] = 's3://foo/bar';
    fakeAccount = {
      elastic: '/fake',
      id: EVENT_DATA_ACCOUNT,
      name: 'Fake',
      tags: ['@account'],
      prefix: '@account',
      index: 'weekly',
      logGroups: [{ filter: '**', tags: ['@logGroup'], prefix: '@logGroup', index: 'daily' }],
    };
    sandbox.stub(ConfigCache, 'get').callsFake(async (key) => {
      if (key === 's3://foo/bar') return [fakeAccount];
      throw new Error('Invalid key fetch: ' + key);
    });
    sandbox.stub(ElasticSearch.prototype, 'save').resolves();

    const s3Return = { promise: () => Promise.resolve({ Body: toLogStream() }) } as any;
    s3Stub = sandbox.stub(s3, 'getObject') as any;
    s3Stub.returns(s3Return);
  });

  afterEach(() => {
    LogShipper.INSTANCE = null;
    sandbox.restore();
  });

  function getLog(index: number): LogObject {
    return LogShipper.INSTANCE?.getElastic(fakeAccount).logs[index] as LogObject;
  }

  function validateItems(): void {
    const firstLog = getLog(0);
    expect(firstLog['@id']).to.equal('35055956108947449057450672217285886913339043275993776128');
    expect(firstLog['@timestamp']).to.equal('2019-10-25T00:30:38.749Z');
    expect(firstLog['@owner']).to.equal(EVENT_DATA_ACCOUNT);
    expect(firstLog['@logGroup']).to.equal('/aws/lambda/s3-log-shipper-ShipFunction-Z4RRMMK7H598');
    expect(firstLog['@logStream']).to.equal('2019/10/25/[$LATEST]a9e13cd4bf854f0d918e5a7a93c89a33');
    expect(firstLog['@tags']).to.include('@account');
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
    fakeAccount.drop = true;
    await handler(getCloudWatchEvent());
    await handler({ Records: [EVENT_DATA] });

    expect(s3Stub.callCount).to.equal(1);

    const firstLog = getLog(0);
    expect(firstLog).to.eq(undefined);
  });

  it('should error if the config is invalid', async () => {
    delete (fakeAccount as any).logGroups;
    try {
      await handler({ Records: [EVENT_DATA] });
      expect(true).eq(false);
    } catch (e) {
      expect(e.message).contains('s3://foo/bar');
    }
  });

  it('should use the index prefixes in order', async () => {
    await handler({ Records: [EVENT_DATA] });
    const shipper = LogShipper.INSTANCE!;
    const firstLog = getLog(0);
    const indexInsert = shipper.getElastic(fakeAccount).indexes.get(firstLog['@id']);

    expect(indexInsert).eq('@logGroup-2019-10-25'); // Daily index with @logGroup prefix
    expect(firstLog['@tags']).deep.eq(['@account', '@logGroup', 'Lambda log']);
  });

  it('should use the account config if no log stream is found', async () => {
    // Remove the log group specifics
    delete fakeAccount.logGroups[0].index;
    delete fakeAccount.logGroups[0].tags;
    delete fakeAccount.logGroups[0].prefix;

    await handler({ Records: [EVENT_DATA] });
    const shipper = LogShipper.INSTANCE!;

    const firstLog = getLog(0);
    const indexInsert = shipper.getElastic(fakeAccount).indexes.get(firstLog['@id']);

    expect(indexInsert).eq('@account-2019-10-24'); // Weekly index with @account prefix
    expect(firstLog['@tags']).deep.eq(['@account', 'Lambda log']);
  });
});
