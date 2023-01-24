'use strict';
import { Client } from '@elastic/elasticsearch';
import { lf } from '@linzjs/lambda';
import { expect } from 'chai';
import sinon from 'sinon';
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
    expect(result).to.be.an('Array');
    expect(result).to.have.lengthOf(3);
    expect(result).to.deep.equal(['{a}', '{b}', '{c}']);
  });
});

describe('processData', () => {
  let shipper: LogShipper;
  const sandbox = sinon.createSandbox();

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

  afterEach(() => {
    sandbox.restore();
  });

  it('should save a log line', async () => {
    const es = shipper.getElastic(fakeConfig);
    const saveStub = sandbox.stub(es, 'save');
    await processCloudWatchData(fakeRequest, logLine);
    expect(saveStub.callCount).equal(0);
    expect(es.logCount).eq(1);

    const [firstLogLine] = es.logs;
    expect(firstLogLine['key']).eq('value');
    expect(firstLogLine['toDrop']).eq('something');

    const firstIndex = es.indexes.get(firstLogLine['@id']);
    expect(firstIndex).equal('foo-index-' + new Date().toISOString().substring(0, 10));
  });

  it('should include the shippingId and timeStamp', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);

    fakeRequest.id = 'fakeRequestId';

    await processCloudWatchData(fakeRequest, logLine);
    expect(es.logs.length).eq(1);

    const [firstLog] = es.logs;

    const currentTime = new Date();
    const shippedTime = new Date(firstLog['@timestampShipped']);
    const diffTime = Math.abs(currentTime.getTime() - shippedTime.getTime());
    expect(diffTime).to.be.lessThan(60_000); // Should be processed in the last minute

    expect(firstLog['@shipperId']).to.equal(fakeRequest.id);
  });

  it('should match multiple configurations', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);
    const esB = shipper.getElastic(fakeConfigB);

    await processCloudWatchData(fakeRequest, logLine);
    expect(es.logs.length).eq(1);
    expect(esB.logs.length).eq(1);

    expect(esB.logs).deep.eq(es.logs);
  });

  it('should work with multiple configurations and drops', async () => {
    const fakeConfigB = { ...fakeConfig, elastic: 'fake-elastic-2' };
    fakeConfig.drop = true;
    shipper.accounts.push(fakeConfigB);
    const es = shipper.getElastic(fakeConfig);
    const esB = shipper.getElastic(fakeConfigB);
    await processCloudWatchData(fakeRequest, logLine);
    expect(es.logs.length).eq(0);
    expect(esB.logs.length).eq(1);
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
    expect(es.logs.length).eq(0);
    expect(esB.logs.length).eq(1);
  });

  it('should drop keys', async () => {
    const es = shipper.getElastic(fakeConfig);

    const saveStub = sandbox.stub(es, 'save');
    fakeConfig.logGroups[0].dropKeys = ['toDrop'];

    await processCloudWatchData(fakeRequest, logLine);
    expect(saveStub.callCount).equal(0);
    expect(es.logs.length).eq(1);

    const [firstLogLine] = es.logs;
    expect(firstLogLine['key']).eq('value');
    expect(firstLogLine['toDrop']).eq(undefined);
  });

  it('should drop indexes', async () => {
    const es = shipper.getElastic(fakeConfig);

    const saveStub = sandbox.stub(es, 'save');
    fakeConfig.logGroups[0].drop = true;
    await processCloudWatchData(fakeRequest, logLine);
    expect(saveStub.callCount).equal(0);
    expect(es.logs.length).eq(0);
  });

  const ElasticError = { type: 'error', reason: 'elastic', caused_by: { type: 'error', reason: 'elastic2' } };

  it('should use the dead letter queue', async () => {
    const es = shipper.getElastic(fakeConfig);
    await processCloudWatchData(fakeRequest, logLine);

    const client = new Client({ node: 'https://127.0.0.1', auth: { username: 'foo', password: 'bar' } });
    sandbox.stub(es, 'createClient').resolves(client);

    const bulkStub = sandbox.stub(client.helpers, 'bulk');

    let dropCount = 0;
    bulkStub.onFirstCall().callsFake((args) => {
      if (!Array.isArray(args.datasource)) throw new Error('Datasource must be an array');

      for (const obj of args.datasource) {
        dropCount++;
        args.onDrop?.({ status: 10, document: obj, error: ElasticError, retried: true });
      }
      return Promise.resolve({}) as any;
    });

    // Second call is the DLQ insert
    bulkStub
      .onSecondCall()
      .resolves({ total: 1, failed: 0, retry: 0, successful: 0, time: 0, bytes: 0, noop: 0, aborted: false });

    await es.save();

    expect(bulkStub.callCount).eq(2);
    expect(dropCount).eq(1);

    const datasource = bulkStub.getCall(1).args[0].datasource as Array<FailedInsertDocument>;
    expect(Array.isArray(datasource)).eq(true);
    expect(datasource[0]['@id']).eq('1');
    expect(datasource[0].reason).deep.eq(ElasticError);
  });
});
