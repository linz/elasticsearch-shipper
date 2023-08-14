import assert from 'node:assert';
import { describe, it } from 'node:test';
import { ConnectionValidator } from '../../config/config.elastic.js';
import { LogShipperConnectionAws, LogShipperConnectionBasic, LogShipperConnectionCloud } from '../../config/config.js';
import { ConfigCache } from '../config.js';
import { ElasticSearch } from '../elastic.js';

function clone<T>(a: T): T {
  return JSON.parse(JSON.stringify(a)) as T;
}

describe('ElasticSearchConfigValidator', () => {
  it('should validate cloud connections', () => {
    const cfg: Partial<LogShipperConnectionCloud> = { id: 'foo', username: 'bar', password: 'baz' };
    assert.equal(ConnectionValidator.Cloud.safeParse(cfg).success, true);

    const cfg2 = clone(cfg);
    delete cfg2.id;
    assert.equal(ConnectionValidator.Cloud.safeParse(cfg2).success, false);
    assert.equal(ConnectionValidator.Cloud.safeParse({}).success, false);
    assert.equal(ConnectionValidator.Cloud.safeParse(null).success, false);
  });

  it('should validate aws connections', () => {
    const cfg: Partial<LogShipperConnectionAws> = { url: 'foo' };
    assert.equal(ConnectionValidator.Aws.safeParse(cfg).success, true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    assert.equal(ConnectionValidator.Aws.safeParse(cfg2).success, false);
    assert.equal(ConnectionValidator.Aws.safeParse({}).success, false);
    assert.equal(ConnectionValidator.Aws.safeParse(null).success, false);
  });

  it('should create a aws connection', async (t) => {
    const es = new ElasticSearch('');
    const config = { url: 'https://foo ' };
    t.mock.method(ConfigCache, 'get', async () => config);
    const result = await es.save();
    assert.equal(result, undefined); // Create a elastic client to the connection
  });

  it('should validate basic connections', () => {
    const cfg: Partial<LogShipperConnectionBasic> = { url: 'foo', username: 'bar', password: 'baz' };
    assert.equal(ConnectionValidator.Basic.safeParse(cfg).success, true);

    const cfg2 = clone(cfg);
    delete cfg2.url;
    assert.equal(ConnectionValidator.Basic.safeParse(cfg2).success, false);
    assert.equal(ConnectionValidator.Basic.safeParse({}).success, false);
    assert.equal(ConnectionValidator.Basic.safeParse(null).success, false);
  });

  it('should give default dead letter queue parameters', () => {
    assert.deepEqual(ConfigCache.getOptions('fake'), { dlq: { name: 'dlq', indexDate: 'daily' }, maxSizeBytes: 4096 });
  });
});
