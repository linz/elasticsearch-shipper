import { lf } from '@linzjs/lambda';
import { Context, S3EventRecord } from 'aws-lambda';
import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { LogShipperConfigAccount } from '../../config/config.js';
import { Env } from '../../env.js';
import { handler, s3 } from '../../shipper/app.js';
import { ElasticSearch, Transform } from '../../shipper/index.js';
import { RequestEvents } from '../../shipper/log.handle.js';
import { LogShipper } from '../../shipper/shipper.config.js';
import { LogObject } from '../../shipper/type.js';
import { EVENT_DATA, EVENT_DATA_ACCOUNT } from '../event.data.js';
import { LOG_DATA, getCloudWatchEvent, toLogStream } from '../log.data.js';

interface LogFunc {
  (obj: Record<string, unknown>, msg: string): void;
}

describe('HandlerIntegration', () => {
  let fakeAccount: LogShipperConfigAccount;
  const s3Return = { promise: (): Promise<unknown> => Promise.resolve({ Body: toLogStream() }) };

  beforeEach(async () => {
    lf.Logger.level = 'silent';
    process.env[Env.ConfigUri] = 's3://foo/bar';
    fakeAccount = {
      elastic: '/fake',
      id: EVENT_DATA_ACCOUNT,
      name: 'Fake',
      tags: ['@account'],
      prefix: '@account',
      index: 'weekly',
      logGroups: [{ filter: '**', tags: ['@logGroup'], prefix: '@logGroup', index: 'daily' }],
      transform: [Transform.tag, Transform.extractJson],
    };
    LogShipper.INSTANCE = new LogShipper([fakeAccount]);
    mock.method(ElasticSearch.prototype, 'save', async () => {
      return {};
    });
  });

  afterEach(() => {
    LogShipper.INSTANCE = null;
    mock.restoreAll();
  });

  function getLog(index: number): LogObject {
    return LogShipper.INSTANCE?.getElastic(fakeAccount).logs[index] as LogObject;
  }

  function handle(event: RequestEvents): Promise<unknown> {
    const ctx = {} as Context;
    return new Promise((resolve, reject) => handler(event, ctx, (a, b) => (a ? reject(a) : resolve(b))));
  }

  function validateItems(): void {
    const firstLog = getLog(0);
    assert.equal(firstLog['@id'], '35055956108947449057450672217285886913339043275993776128');
    assert.equal(firstLog['@timestamp'], '2019-10-25T00:30:38.749Z');
    assert.equal(firstLog['@owner'], EVENT_DATA_ACCOUNT);
    assert.equal(firstLog['@logGroup'], '/aws/lambda/s3-log-shipper-ShipFunction-Z4RRMMK7H598');
    assert.equal(firstLog['@logStream'], '2019/10/25/[$LATEST]a9e13cd4bf854f0d918e5a7a93c89a33');
    assert.ok(firstLog['@tags']?.includes('@account'));
    assert.ok(firstLog['@tags']?.includes('@logGroup'));
    assert.ok(firstLog['@tags']?.includes('Lambda log'));

    // Should extract keys from JSON log lines
    const secondLog = getLog(1);
    assert.equal(secondLog['level'], 30);
    assert.equal(secondLog['pid'], 375);
    assert.equal(secondLog['msg'], 'ProcessEvents');
  }

  it('should process s3 test data', async (t) => {
    const s3Stub = t.mock.method(s3, 'getObject', () => s3Return);
    await handle({ Records: [EVENT_DATA] });

    assert.equal(s3Stub.mock.callCount(), 1);
    const firstS3Call = s3Stub.mock.calls[0].arguments;
    assert.deepEqual(firstS3Call[0], { Key: EVENT_DATA.s3.object.key, Bucket: EVENT_DATA.s3.bucket.name });

    validateItems();

    // Source is only set on s3 test data
    const firstLog = getLog(0);
    assert.equal(
      firstLog['@source'],
      '111111111111/222222222222/2019/10/13/22/Centralized-Logging-Delivery-Stream-222222222222-1-2019-10-13-22-02-27-c964ea97-8f7e-46d4-8539-5998f4d9f603',
    );
  });

  it('should process cloudwatch data', async (t) => {
    const s3Stub = t.mock.method(s3, 'getObject', () => s3Return);

    await handle(getCloudWatchEvent());

    assert.equal(s3Stub.mock.callCount(), 0);

    const firstLog = getLog(0);
    assert.equal(firstLog['@source'], undefined);
  });

  it('should drop unknown accounts', async (t) => {
    const newLogData = JSON.parse(JSON.stringify(LOG_DATA[1]));
    newLogData.owner = 'foo';

    const newEventData: S3EventRecord = JSON.parse(JSON.stringify(EVENT_DATA));
    newEventData.s3.object.key = 'abc123';
    const s3Stub = t.mock.method(s3, 'getObject', () => {
      return { promise: () => Promise.resolve({ Body: toLogStream([newLogData]) }) } as any;
    });

    await handle(getCloudWatchEvent(newLogData));
    await handle({ Records: [newEventData] });

    assert.equal(s3Stub.mock.callCount(), 1);

    const firstLog = getLog(0);
    assert.equal(firstLog, undefined);
  });

  it('should drop by account when told to', async (t) => {
    const s3Stub = t.mock.method(s3, 'getObject', () => s3Return);

    fakeAccount.drop = true;
    await handle(getCloudWatchEvent());
    await handle({ Records: [EVENT_DATA] });

    assert.equal(s3Stub.mock.callCount(), 1);

    const firstLog = getLog(0);
    assert.equal(firstLog, undefined);
  });

  it('should error if the config is invalid', async (t) => {
    delete (fakeAccount as any).logGroups;
    LogShipper.INSTANCE = null;

    lf.Logger.level = 'info';
    t.mock.method(lf.Logger, 'child', () => lf.Logger);
    t.mock.method(lf.Logger, 'fatal', () => null);
    const logFunc: LogFunc = () => null;
    const logStubError = t.mock.method(lf.Logger, 'error', logFunc);
    try {
      await handle({ Records: [EVENT_DATA] });
      assert.fail(); // Should have thrown
    } catch (e) {
      assert.ok(String(e).includes('Error: LogShipper has not been configured'));
    }
    assert.equal(logStubError.mock.callCount(), 1);
    assert.equal(logStubError.mock.calls[0].arguments[0]['@type'], 'report');
    assert.equal(logStubError.mock.calls[0].arguments[0]['status'], 500);
    assert.equal(String(logStubError.mock.calls[0].arguments[0]['err']), 'Error: LogShipper has not been configured');
    assert.equal(logStubError.mock.calls[0].arguments[1], 'Lambda:Done');
  });

  it('should use the index prefixes in order', async (t) => {
    t.mock.method(s3, 'getObject', () => s3Return);
    await handle({ Records: [EVENT_DATA] });
    const shipper = LogShipper.INSTANCE!;
    const firstLog = getLog(0);
    const indexInsert = shipper.getElastic(fakeAccount).indexes.get(firstLog['@id']);

    assert.equal(indexInsert, '@logGroup-2019-10-25'); // Daily index with @logGroup prefix
    assert.deepEqual(firstLog['@tags'], ['@account', '@logGroup', 'Lambda log']);
  });

  it('should use the account config if no log stream is found', async (t) => {
    t.mock.method(s3, 'getObject', () => s3Return);
    // Remove the log group specifics
    delete fakeAccount.logGroups[0].index;
    delete fakeAccount.logGroups[0].tags;
    delete fakeAccount.logGroups[0].prefix;

    await handle({ Records: [EVENT_DATA] });
    const shipper = LogShipper.INSTANCE!;

    const firstLog = getLog(0);
    const indexInsert = shipper.getElastic(fakeAccount).indexes.get(firstLog['@id']);

    assert.equal(indexInsert, '@account-2019-10-24'); // Weekly index with @account prefix
    assert.deepEqual(firstLog['@tags'], ['@account', 'Lambda log']);
  });
});
