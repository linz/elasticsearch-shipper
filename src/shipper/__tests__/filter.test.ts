import { describe, it } from 'node:test';
import { LogShipperConfigAccount } from '../../config/config.js';
import { LogShipper } from '../../shipper/shipper.config.js';
import assert from 'node:assert';

describe('LogConfigFilter', () => {
  const shipper: LogShipper = new LogShipper([]);

  it('should match everything', () => {
    const config: LogShipperConfigAccount = {
      id: '1',
      index: 1,
      prefix: 'fake-index',
      elastic: 'fake-elastic',
      name: 'b',
      logGroups: [{ filter: '**', prefix: 'prefix' }],
    };

    const logA = shipper.getLogConfig(config, 'abc123');
    assert.deepEqual(logA, config.logGroups[0]);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    assert.deepEqual(logB, config.logGroups[0]);
  });

  it('should match prefixes', () => {
    const config: LogShipperConfigAccount = {
      id: '1',
      index: 1,
      prefix: 'fake-index',
      elastic: 'fake-elastic',
      name: 'b',
      logGroups: [{ filter: '/aws/lambda/**', prefix: 'prefix' }],
    };
    const logA = shipper.getLogConfig(config, 'abc123');
    assert.equal(logA, undefined);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    assert.equal(logB, undefined);

    const logC = shipper.getLogConfig(config, '/aws/lambda/foo/bar');
    assert.deepEqual(logC, config.logGroups[0]);
  });
});
