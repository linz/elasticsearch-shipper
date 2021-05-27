import { expect } from 'chai';
import sinon from 'sinon';
import { LogShipper } from '../shipper.config';

describe('LogShipper', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());
  it('should load configuration from ssm on save', async () => {
    const loadStub = sandbox.stub(LogShipper, 'parameterStoreConfig').returns(Promise.resolve({ url: 'foo' }));
    const shipper = new LogShipper({ elastic: { name: '/foo' } } as any);
    expect(loadStub.called).equal(false);

    await shipper.save(null as any);
    expect(loadStub.called).equal(true);
    expect(loadStub.args[0]).deep.equal(['/foo']);
  });

  it('should fail if ssm config is not valid', async () => {
    const loadStub = sandbox.stub(LogShipper, 'parameterStoreConfig').returns(Promise.resolve({}));
    const shipper = new LogShipper({ elastic: { name: '/foo' } } as any);

    const logStub = { error: sandbox.stub() };
    expect(loadStub.called).equal(false);

    try {
      await shipper.save(logStub as any);
      expect(true).eq(false); // Should have thrown a error
    } catch (e) {
      expect(logStub.error.called).equal(true);
      expect(e.toString()).contains('Invalid input');
    }
    expect(loadStub.called).equal(true);
    expect(loadStub.args[0]).deep.equal(['/foo']);
  });
});
