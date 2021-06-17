import { expect } from 'chai';
import sinon from 'sinon';
import { ExampleConfigMinimal } from '../../__tests__/config.test';
import { LogShipper } from '../shipper.config';
import { SsmCache } from '../ssm';

describe('LogShipper', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('should fail if ssm config is not valid', async () => {
    const loadStub = sandbox.stub(SsmCache, 'get').returns(Promise.resolve({}));
    const shipper = new LogShipper([]);
    shipper.getElastic(ExampleConfigMinimal);

    const logStub = { error: sandbox.stub() };
    expect(loadStub.called).equal(false);

    try {
      await shipper.save(logStub as any);
      expect(true).eq(false); // Should have thrown a error
    } catch (e) {
      expect(logStub.error.called).equal(false);
      expect(e.toString()).contains(ExampleConfigMinimal.elastic);
    }
    expect(loadStub.called).equal(true);
    expect(loadStub.args[0]).deep.equal([ExampleConfigMinimal.elastic]);
  });
});
