import { describe, it } from 'node:test';
import { ElasticSearch } from '../../shipper/elastic.js';
import { LogObject } from '../../shipper/type.js';
import assert from 'node:assert';

describe('ElasticSearch', () => {
  function makeLog(time: string): LogObject {
    return {
      '@id': '1',
      '@timestamp': time,
      '@timestampShipped': time,
      '@owner': '1234',
      '@logGroup': 'bar',
      '@logStream': 'baz',
      '@source': 'foobar',
      '@shipperId': '',
      '@tags': [],
    };
  }
  it('should create monthly index names', () => {
    const es = new ElasticSearch('');
    const indexName = es.getIndexName(makeLog('2019-10-12T15'), 'prefix', 'monthly');
    assert.equal(indexName, 'prefix-2019-10');

    const indexNameB = es.getIndexName(makeLog('2019-10-13T15'), 'prefix', 'monthly');
    assert.equal(indexNameB, 'prefix-2019-10');
  });

  it('should create yearly index names', () => {
    const es = new ElasticSearch('');
    const indexName = es.getIndexName(makeLog('2019-10-12T15'), 'prefix', 'yearly');
    assert.equal(indexName, 'prefix-2019');

    const indexNameB = es.getIndexName(makeLog('2019-10-13T15'), 'prefix', 'yearly');
    assert.equal(indexNameB, 'prefix-2019');
  });

  it('should create daily index names when DAILY_INDEX is true', () => {
    const es = new ElasticSearch('');
    const indexName = es.getIndexName(makeLog('2019-10-12T15'), 'prefix', 'daily');
    assert.equal(indexName, 'prefix-2019-10-12');

    const indexNameB = es.getIndexName(makeLog('2019-10-13T15'), 'prefix', 'daily');
    assert.equal(indexNameB, 'prefix-2019-10-13');
  });

  it('should create weekly index names', () => {
    const es = new ElasticSearch('');

    assert.equal(es.getIndexName(makeLog('2019-10-05T15:00:00.000Z'), 'prefix', 'weekly'), 'prefix-2019-10-03');
    assert.equal(es.getIndexName(makeLog('2019-10-06T15:00:00.000Z'), 'prefix', 'weekly'), 'prefix-2019-10-03');
    assert.equal(es.getIndexName(makeLog('2019-10-07T15:00:00.000Z'), 'prefix', 'weekly'), 'prefix-2019-10-03');
    assert.equal(es.getIndexName(makeLog('2019-10-16T15:00:00.000Z'), 'prefix', 'weekly'), 'prefix-2019-10-10');
    assert.equal(es.getIndexName(makeLog('2019-10-16T23:59:59.999Z'), 'prefix', 'weekly'), 'prefix-2019-10-10');
    assert.equal(es.getIndexName(makeLog('2019-10-17T00:00:00.000Z'), 'prefix', 'weekly'), 'prefix-2019-10-17');
  });

  it('should create numeric index names', () => {
    const es = new ElasticSearch('');

    assert.equal(es.getIndexName(makeLog('2019-10-05T15:00:00.000Z'), 'prefix', 2), 'prefix-2019-10-05');
    assert.equal(es.getIndexName(makeLog('2019-10-06T15:00:00.000Z'), 'prefix', 2), 'prefix-2019-10-05');
    assert.equal(es.getIndexName(makeLog('2019-10-07T15:00:00.000Z'), 'prefix', 2), 'prefix-2019-10-07');

    assert.equal(es.getIndexName(makeLog('2019-10-16T15:00:00.000Z'), 'prefix', 3), 'prefix-2019-10-14');
    assert.equal(es.getIndexName(makeLog('2019-10-16T23:59:59.999Z'), 'prefix', 3), 'prefix-2019-10-14');
    assert.equal(es.getIndexName(makeLog('2019-10-17T00:00:00.000Z'), 'prefix', 3), 'prefix-2019-10-17');
  });
});
