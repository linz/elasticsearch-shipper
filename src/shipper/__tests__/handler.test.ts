import { Client } from '@elastic/elasticsearch';
import { lf } from '@linzjs/lambda';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { LogShipperConfigAccount } from '../../config/config.js';
import { FailedInsertDocument } from '../elastic.js';
import { LogRequest, processCloudWatchData, splitJsonString } from '../log.handle.js';
import { LogShipper } from '../shipper.config.js';
import { LogStats } from '../stats.js';
import { onLogExtractJson } from '../transform/extract.json.js';
import { onLogTag } from '../transform/tag.js';

lf.Logger.level = 'silent';

describe('splitJSONString', () => {
  it('works without a callback', () => {
    const result = splitJsonString('{a}{b}{c}');
    assert.equal(result.length, 3);
    assert.deepEqual(result, ['{a}', '{b}', '{c}']);
  });
});

describe('processData', () => {
  let shipper: LogShipper;

  const logLine = {
    owner: '123',
    logGroup: '/aws/lambda/foo',
    logStream: 'foo-bar',
    subscriptionFilters: [],
    messageType: 'something',
    logEvents: [{ id: '1', timestamp: Date.now(), message: JSON.stringify({ key: 'value', toDrop: 'something' }) }],
  };
  let fakeConfig: LogShipperConfigAccount;
  let fakeRequest: LogRequest;

  beforeEach(() => {
    fakeConfig = {
      id: '123',
      elastic: 'fake-elastic',
      name: 'fake-config',
      index: 1,
      prefix: 'fake-index',
      logGroups: [
        {
          filter: '/aws/lambda/foo**',
          prefix: 'foo-index',
          index: 1,
        },
      ],
      transform: [onLogTag, onLogExtractJson],
    };
    shipper = new LogShipper([fakeConfig]);
    fakeRequest = { shipper, log: lf.Logger, stats: new LogStats() } as LogRequest;
  });

  it('should save a log line', async (t) => {
    const es = shipper.getElastic(fakeConfig);
    const saveStub = t.mock.method(es, 'save');
    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(saveStub.mock.callCount(), 0);
    assert.equal(es.logCount, 1);

    const [firstLogLine] = es.logs;
    assert.equal(firstLogLine['key'], 'value');
    assert.equal(firstLogLine['toDrop'], 'something');

    const firstIndex = es.indexes.get(firstLogLine['@id']);
    assert.equal(firstIndex, 'foo-index-' + new Date().toISOString().substring(0, 10));
  });

  it('should include the shippingId and timeStamp', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);

    fakeRequest.id = 'fakeRequestId';

    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(es.logs.length, 1);

    const [firstLog] = es.logs;

    const currentTime = new Date();
    const shippedTime = new Date(firstLog['@timestampShipped']);
    const diffTime = Math.abs(currentTime.getTime() - shippedTime.getTime());
    assert.ok(diffTime < 60_000); // Should be processed in the last minute

    assert.equal(firstLog['@shipperId'], fakeRequest.id);
  });

  it('should match multiple configurations', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);
    const esB = shipper.getElastic(fakeConfigB);

    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(es.logs.length, 1);
    assert.equal(esB.logs.length, 1);

    assert.deepEqual(esB.logs, es.logs);
  });

  it('should work with multiple configurations and drops', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    fakeConfig.drop = true;
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);
    const esB = shipper.getElastic(fakeConfigB);
    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(es.logs.length, 0);
    assert.equal(esB.logs.length, 1);
  });

  it('should work with multiple configurations and account drops', async () => {
    const fakeConfigB = {
      ...fakeConfig,
      logGroups: [{ ...fakeConfig.logGroups[0] }],
      elastic: 'fake-elastic-2',
    };
    fakeConfig.logGroups[0].drop = true;
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);
    const esB = shipper.getElastic(fakeConfigB);
    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(es.logs.length, 0);
    assert.equal(esB.logs.length, 1);
  });

  it('should drop keys', async (t) => {
    const es = shipper.getElastic(fakeConfig);

    const saveStub = t.mock.method(es, 'save');
    fakeConfig.logGroups[0].dropKeys = ['toDrop'];

    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(saveStub.mock.callCount(), 0);
    assert.equal(es.logs.length, 1);

    const [firstLogLine] = es.logs;
    assert.equal(firstLogLine['key'], 'value');
    assert.equal(firstLogLine['toDrop'], undefined);
  });

  it('should drop indexes', async (t) => {
    const es = shipper.getElastic(fakeConfig);

    const saveStub = t.mock.method(es, 'save');
    fakeConfig.logGroups[0].drop = true;
    await processCloudWatchData(fakeRequest, logLine);
    assert.equal(saveStub.mock.callCount(), 0);
    assert.equal(es.logs.length, 0);
  });

  const ElasticError = { type: 'error', reason: 'elastic', caused_by: { type: 'error', reason: 'elastic2' } };

  it('should use the dead letter queue', async (t) => {
    const es = shipper.getElastic(fakeConfig);
    await processCloudWatchData(fakeRequest, logLine);

    const client = new Client({ node: 'https://127.0.0.1', auth: { username: 'foo', password: 'bar' } });
    t.mock.method(es, 'createClient', async () => client);

    let dropCount = 0;

    const bulkStub = t.mock.method(client.helpers, 'bulk', async (args: any) => {
      // Second call is the DLQ insert
      if (bulkStub.mock.callCount() > 0) {
        return { total: 1, failed: 0, retry: 0, successful: 0, time: 0, bytes: 0, noop: 0, aborted: false };
      }
      if (!Array.isArray(args.datasource)) throw new Error('Datasource must be an array');

      for (const obj of args.datasource) {
        dropCount++;
        args.onDrop?.({ status: 10, document: obj, error: ElasticError, retried: true });
      }
      return Promise.resolve({}) as any;
    });

    await es.save();

    assert.equal(bulkStub.mock.callCount(), 2);
    assert.equal(dropCount, 1);

    const datasource = bulkStub.mock.calls[1].arguments[0].datasource as Array<FailedInsertDocument>;
    assert.equal(Array.isArray(datasource), true);
    assert.equal(datasource[0]['@id'], '1');
    assert.deepEqual(datasource[0].reason, ElasticError);
  });
});
