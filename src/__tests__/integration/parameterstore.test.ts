import { expect } from 'chai';
import * as sinon from 'sinon';
import { Env } from '../../env';
import { LogShipper } from '../../shipper/shipper.config';
import { ExampleConfigMinimal } from '../config.test';

describe('AccountConfigFilter', () => {
  const sandbox = sinon.createSandbox();
  let shipper: LogShipper;
  beforeEach(async () => {
    process.env[Env.ConfigUri] = 's3://foo/bar';
    LogShipper.INSTANCE = null;
    LogShipper.configure([ExampleConfigMinimal]);
    shipper = await LogShipper.get();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should correctly parse parameter store configs', async () => {
    const config = shipper.getAccounts('1234567890');
    expect(config.length).eq(1);
    expect(config[0].id).to.eq('1234567890');
    expect(config[0].tags).to.contain('hello');
    expect(config[0].logGroups).to.not.be.undefined;
  });
});
