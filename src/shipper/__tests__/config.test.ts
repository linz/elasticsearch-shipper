import { expect } from 'chai';
import {
  ConnectionValidator,
  LogShipperConnectionAws,
  LogShipperConnectionBasic,
  LogShipperConnectionCloud,
  LogShipperConnectionSsm,
} from '../../config/config.elastic';
import * as aec from '@acuris/aws-es-connection';
import { ElasticSearch } from '../elastic';
import sinon from 'sinon';

function clone<T>(a: T): T {
  return JSON.parse(JSON.stringify(a)) as T;
}

describe('ElasticSearchConfigValidator', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.restore());

  it('should validate cloud connections', () => {
    const cfg: Partial<LogShipperConnectionCloud> = { id: 'foo', username: 'bar', password: 'baz' };
    expect(ConnectionValidator.Cloud.safeParse(cfg).success).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.id;
    expect(ConnectionValidator.Cloud.safeParse(cfg2).success).equals(false);
    expect(ConnectionValidator.Cloud.safeParse({}).success).equals(false);
    expect(ConnectionValidator.Cloud.safeParse(null).success).equals(false);
  });

  it('should validate aws connections', () => {
    const cfg: Partial<LogShipperConnectionAws> = { url: 'foo' };
    expect(ConnectionValidator.Aws.safeParse(cfg).success).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    expect(ConnectionValidator.Aws.safeParse(cfg2).success).equals(false);
    expect(ConnectionValidator.Aws.safeParse({}).success).equals(false);
    expect(ConnectionValidator.Aws.safeParse(null).success).equals(false);
  });

  it('should validate ssm connections', () => {
    const cfg: Partial<LogShipperConnectionSsm> = { name: '/foo' };
    expect(ConnectionValidator.Aws.safeParse(cfg).success).equals(false);
    expect(ConnectionValidator.Ssm.safeParse(cfg).success).equals(true);
    expect(ConnectionValidator.Basic.safeParse(cfg).success).equals(false);
    expect(ConnectionValidator.Cloud.safeParse(cfg).success).equals(false);
  });

  it('should require ssm to start with /', () => {
    const cfg: Partial<LogShipperConnectionSsm> = { name: 'foo' };
    expect(ConnectionValidator.Ssm.safeParse(cfg).success).equals(false);
  });

  it('should create a aws connection', async () => {
    const es = new ElasticSearch();
    sandbox.stub(aec, 'awsGetCredentials');
    return es.save({ url: 'https://foo ' }).then((result) => {
      expect(result).to.not.equal(null);
    }); // Create a elastic client to the connection
  });

  it('should validate basic connections', () => {
    const cfg: Partial<LogShipperConnectionBasic> = { url: 'foo', username: 'bar', password: 'baz' };
    expect(ConnectionValidator.Basic.safeParse(cfg).success).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    expect(ConnectionValidator.Basic.safeParse(cfg2).success).equals(false);
    expect(ConnectionValidator.Basic.safeParse({}).success).equals(false);
    expect(ConnectionValidator.Basic.safeParse(null).success).equals(false);
  });
});
