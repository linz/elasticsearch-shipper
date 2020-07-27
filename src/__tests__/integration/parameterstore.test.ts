import { expect } from 'chai';
import * as sinon from 'sinon';
import { LogShipper, ssm } from '../../shipper/shipper.config';
import { ExampleConfigMinimal } from '../config.test';

describe('AccountConfigFilter', () => {
  const sandbox = sinon.createSandbox();
  let loadStub: sinon.SinonStub;
  let shipper: LogShipper;
  beforeEach(async () => {
    const dummyResult = {
      Parameter: {
        Value: JSON.stringify(ExampleConfigMinimal),
      },
    };
    loadStub = sandbox.stub(ssm, 'getParameter').returns({ promise: async () => dummyResult } as any);
    shipper = await LogShipper.load();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should retrieve from parameter store when told to', async () => {
    expect(loadStub.callCount).eq(1);
    // Should return same object
    await LogShipper.load();
    expect(loadStub.callCount).eq(1);

    // old dates should trigger a new load
    shipper.initializedAt = Date.now() - 301 * 1000;
    await LogShipper.load();
    expect(loadStub.callCount).eq(2);
  });

  it('should correctly parse parameter store configs', async () => {
    const config = shipper.getAccount('1234567890');
    expect(config).not.eq(null);
    expect(config?.id).to.eq('1234567890');
    expect(config?.tags).to.contain('hello');
    expect(config?.logGroups).to.not.be.undefined;
  });
});
