import { expect } from 'chai';
import {
  ConnectionValidator,
  LogShipperConnectionAws,
  LogShipperConnectionBasic,
  LogShipperConnectionCloud,
} from '../../config/config.elastic';

function clone<T>(a: T): T {
  return JSON.parse(JSON.stringify(a)) as T;
}

describe('ElasticSearchConfigValidator', () => {
  it('should validate cloud connections', () => {
    const cfg: LogShipperConnectionCloud = { id: 'foo', username: 'bar', password: 'baz' };
    expect(ConnectionValidator.Cloud.check(cfg)).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.id;
    expect(ConnectionValidator.Cloud.check(cfg2)).equals(false);
    expect(ConnectionValidator.Cloud.check({})).equals(false);
    expect(ConnectionValidator.Cloud.check(null)).equals(false);
  });

  it('should validate aws connections', () => {
    const cfg: LogShipperConnectionAws = { url: 'foo' };
    expect(ConnectionValidator.Aws.check(cfg)).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    expect(ConnectionValidator.Aws.check(cfg2)).equals(false);
    expect(ConnectionValidator.Aws.check({})).equals(false);
    expect(ConnectionValidator.Aws.check(null)).equals(false);
  });

  it('should validate basic connections', () => {
    const cfg: LogShipperConnectionBasic = { url: 'foo', username: 'bar', password: 'baz' };
    expect(ConnectionValidator.Basic.check(cfg)).equals(true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    expect(ConnectionValidator.Basic.check(cfg2)).equals(false);
    expect(ConnectionValidator.Basic.check({})).equals(false);
    expect(ConnectionValidator.Basic.check(null)).equals(false);
  });
});
