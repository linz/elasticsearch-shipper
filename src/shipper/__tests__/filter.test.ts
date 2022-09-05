import { expect } from 'chai';
import { LogShipperConfigAccount } from '../../config/config.js';
import { LogShipper } from '../../shipper/shipper.config.js';

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
    expect(logA).to.deep.eq(config.logGroups[0]);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    expect(logB).to.deep.eq(config.logGroups[0]);
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
    expect(logA).to.eq(undefined);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    expect(logB).to.eq(undefined);

    const logC = shipper.getLogConfig(config, '/aws/lambda/foo/bar');
    expect(logC).to.deep.eq(config.logGroups[0]);
  });
});
