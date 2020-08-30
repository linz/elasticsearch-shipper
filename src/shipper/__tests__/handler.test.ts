'use strict';
import { expect } from 'chai';
import sinon from 'sinon';
import { Log } from '../../logger';
import { processCloudWatchData, splitJsonString } from '../log.handle';
import { LogShipper } from '../shipper.config';
import { LogObject } from '../type';

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

  beforeEach(() => {
    shipper = new LogShipper({} as any);
    shipper.config.accounts = [
      {
        id: '123',
        name: 'fake-config',
        logGroups: [
          {
            filter: '/aws/lambda/foo**',
            prefix: 'foo-index',
            index: 1,
          },
        ],
      },
    ];
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should save a log line', async () => {
    const saveStub = sandbox.stub(shipper.es, 'save');
    await processCloudWatchData(shipper, logLine, Log);
    expect(saveStub.callCount).equal(1);
    expect(shipper.es.body.length).eq(2);
    const firstIndexLine = shipper.es.body[0] as any;
    expect(firstIndexLine.index._index).equal('foo-index-123-' + new Date().toISOString().substring(0, 10));
    const firstLogLine = shipper.es.body[1] as LogObject;
    expect(firstLogLine['key']).eq('value');
    expect(firstLogLine['toDrop']).eq('something');
  });

  it('should drop keys', async () => {
    const saveStub = sandbox.stub(shipper.es, 'save');
    shipper.config.accounts[0].logGroups[0].dropKeys = ['toDrop'];

    await processCloudWatchData(shipper, logLine, Log);
    expect(saveStub.callCount).equal(1);
    expect(shipper.es.body.length).eq(2);
    const firstLogLine = shipper.es.body[1] as LogObject;
    expect(firstLogLine['key']).eq('value');
    expect(firstLogLine['toDrop']).eq(undefined);
  });

  it('should drop indexes', async () => {
    const saveStub = sandbox.stub(shipper.es, 'save');
    shipper.config.accounts[0].logGroups[0].drop = true;
    await processCloudWatchData(shipper, logLine, Log);
    expect(saveStub.callCount).equal(0);
    expect(shipper.es.body.length).eq(0);
  });
});
