import { expect } from 'chai';
import { ElasticSearch } from '../../shipper/elastic';
import { LogObject } from '../../shipper/log';

describe('ElasticSearch', () => {
  function makeLog(time: string): LogObject {
    return {
      '@id': '1',
      '@timestamp': time,
      '@owner': '1234',
      '@logGroup': 'bar',
      '@logStream': 'baz',
      '@source': 'foobar',
      '@tags': [],
    };
  }
  it('should create monthly index names', () => {
    const es = new ElasticSearch({ elastic: { url: '' } } as any);
    const indexName = es.getIndexName(makeLog('2019-10-12T15'), 'prefix', 'monthly');
    expect(indexName).to.equal('prefix-1234-2019-10');

    const indexNameB = es.getIndexName(makeLog('2019-10-13T15'), 'prefix', 'monthly');
    expect(indexNameB).to.equal('prefix-1234-2019-10');
  });

  it('should create daily index names when DAILY_INDEX is true', () => {
    const es = new ElasticSearch({ elastic: { url: '' } } as any);
    const indexName = es.getIndexName(makeLog('2019-10-12T15'), 'prefix', 'daily');
    expect(indexName).to.equal('prefix-1234-2019-10-12');

    const indexNameB = es.getIndexName(makeLog('2019-10-13T15'), 'prefix', 'daily');
    expect(indexNameB).to.equal('prefix-1234-2019-10-13');
  });

  it('should create weekly index names', () => {
    const es = new ElasticSearch({ elastic: { url: '' } } as any);

    expect(es.getIndexName(makeLog('2019-10-05T15:00:00.000Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-03');
    expect(es.getIndexName(makeLog('2019-10-06T15:00:00.000Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-03');
    expect(es.getIndexName(makeLog('2019-10-07T15:00:00.000Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-03');
    expect(es.getIndexName(makeLog('2019-10-16T15:00:00.000Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-10');
    expect(es.getIndexName(makeLog('2019-10-16T23:59:59.999Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-10');
    expect(es.getIndexName(makeLog('2019-10-17T00:00:00.000Z'), 'prefix', 'weekly')).to.equal('prefix-1234-2019-10-17');
  });

  it('should create numeric index names', () => {
    const es = new ElasticSearch({ elastic: { url: '' } } as any);

    expect(es.getIndexName(makeLog('2019-10-05T15:00:00.000Z'), 'prefix', 2)).to.equal('prefix-1234-2019-10-05');
    expect(es.getIndexName(makeLog('2019-10-06T15:00:00.000Z'), 'prefix', 2)).to.equal('prefix-1234-2019-10-05');
    expect(es.getIndexName(makeLog('2019-10-07T15:00:00.000Z'), 'prefix', 2)).to.equal('prefix-1234-2019-10-07');

    expect(es.getIndexName(makeLog('2019-10-16T15:00:00.000Z'), 'prefix', 3)).to.equal('prefix-1234-2019-10-14');
    expect(es.getIndexName(makeLog('2019-10-16T23:59:59.999Z'), 'prefix', 3)).to.equal('prefix-1234-2019-10-14');
    expect(es.getIndexName(makeLog('2019-10-17T00:00:00.000Z'), 'prefix', 3)).to.equal('prefix-1234-2019-10-17');
  });
});
