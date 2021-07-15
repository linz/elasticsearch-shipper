import { expect } from 'chai';
import sinon from 'sinon';
import { Env } from '../../env';
import { ExampleConfigMinimal } from '../../__tests__/config.test';
import { s3, ssm } from '../app';
import { LogShipper } from '../shipper.config';
import { ConfigCache } from '../config';
import { AwsStub } from './s3.stub';

describe('LogShipper', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
    LogShipper.INSTANCE = null;
  });

  it('should fail if ssm config is not valid', async () => {
    const loadStub = sandbox.stub(ConfigCache, 'get').returns(Promise.resolve({}));
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

  it('should load config from ssm and s3', async () => {
    process.env[Env.ConfigUri] = 'ssm://config/value-a';
    const getParam = sandbox.stub(ssm, 'getParameter').callsFake((): any => AwsStub.toSsm([]));
    const getObject = sandbox.stub(s3, 'getObject').callsFake((): any => AwsStub.toS3([]));

    await LogShipper.load();

    expect(getObject.callCount).equal(0);
    expect(getParam.callCount).equal(1);
    expect(getParam.getCall(0).args[0]).deep.equal({ Name: '/config/value-a' });
  });

  it('should load config from  s3', async () => {
    process.env[Env.ConfigUri] = 's3://bucket/value-a';
    const getParam = sandbox.stub(ssm, 'getParameter').callsFake((): any => AwsStub.toSsm([]));
    const getObject = sandbox.stub(s3, 'getObject').callsFake((): any => AwsStub.toS3([]));

    await LogShipper.load();

    expect(getParam.callCount).equal(0);
    expect(getObject.callCount).equal(1);
    expect(getObject.getCall(0).args[0]).deep.equal({ Key: 'value-a', Bucket: 'bucket' });
  });
});
