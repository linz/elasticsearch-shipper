import { beforeEach, describe, it } from 'node:test';
import { Env } from '../../env.js';
import { LogShipper } from '../../shipper/shipper.config.js';
import { ExampleConfigMinimal } from '../config.test.js';
import assert from 'node:assert';

describe('AccountConfigFilter', () => {
  let shipper: LogShipper;
  beforeEach(async () => {
    process.env[Env.ConfigUri] = 's3://foo/bar';
    LogShipper.INSTANCE = null;
    LogShipper.configure([ExampleConfigMinimal]);
    shipper = await LogShipper.get();
  });

  it('should correctly parse parameter store configs', async () => {
    const config = shipper.getAccounts('1234567890');
    assert.equal(config.length, 1);
    assert.equal(config[0].id, '1234567890');
    assert.ok(config[0].tags?.includes('hello'));
    assert.ok(config[0].logGroups);
  });
});
