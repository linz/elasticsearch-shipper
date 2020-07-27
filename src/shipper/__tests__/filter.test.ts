import { expect } from 'chai';
import { LogShipper } from '../../shipper/shipper.config';

describe('LogConfigFilter', () => {
  const shipper: LogShipper = new LogShipper({} as any);

  it('should match everything', () => {
    const config = { id: '1', name: 'b', logGroups: [{ filter: '**', prefix: 'prefix' }], elastic: { url: '' } };

    const logA = shipper.getLogConfig(config, 'abc123');
    expect(logA).to.deep.eq(config.logGroups[0]);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    expect(logB).to.deep.eq(config.logGroups[0]);
  });

  it('should match prefixes', () => {
    const config = {
      id: '1',
      name: 'b',
      logGroups: [{ filter: '/aws/lambda/**', prefix: 'prefix' }],
      elastic: { url: '' },
    };
    const logA = shipper.getLogConfig(config, 'abc123');
    expect(logA).to.eq(undefined);

    const logB = shipper.getLogConfig(config, '/aws/lambda');
    expect(logB).to.eq(undefined);

    const logC = shipper.getLogConfig(config, '/aws/lambda/foo/bar');
    expect(logC).to.deep.eq(config.logGroups[0]);
  });
});
