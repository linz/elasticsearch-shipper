import { expect } from 'chai';
import * as sinon from 'sinon';
import { Env } from '../../env';
import { LogShipper } from '../../shipper/shipper.config';
import { ConfigCache } from '../../shipper/config';
import { ExampleConfigMinimal } from '../config.test';

describe('AccountConfigFilter', () => {
  const sandbox = sinon.createSandbox();
  let loadStub: sinon.SinonStub;
  let shipper: LogShipper;
  beforeEach(async () => {
    process.env[Env.ConfigUri] = 's3://foo/bar';
    loadStub = sandbox.stub(ConfigCache, 'get').callsFake(async () => [ExampleConfigMinimal]);
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
    expect(config.length).eq(1);
    expect(config[0].id).to.eq('1234567890');
    expect(config[0].tags).to.contain('hello');
    expect(config[0].logGroups).to.not.be.undefined;
  });
});
