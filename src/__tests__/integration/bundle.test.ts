import { expect } from 'chai';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import sinon from 'sinon';
import { LogShipperConfigAccount } from '../../config/config';
import { Env } from '../../env';
import { AwsStub } from '../../shipper/__tests__/s3.stub';
import { EVENT_DATA_ACCOUNT } from '../event.data';
import { getCloudWatchEvent, getS3Event, toLogStream } from '../log.data';
/* eslint-disable @typescript-eslint/no-var-requires */

const Port = process.env.PORT ?? 44551;
const BundlePath = path.join(__dirname, '../../../../dist/index.js');

/** Validate that the built bundle actually works */
describe('bundled lambda', () => {
  // Only need the bundle code to exist inside of ci
  if (!fs.existsSync(BundlePath)) {
    if (process.env.CI) throw new Error('No bundled code found');
    console.log('Skipping bundle tests as dist/index.js is missing');
    return;
  }
  const sandbox = sinon.createSandbox();

  const pkg = require(BundlePath);
  pkg.Log.level = 'silent';

  // Stupid little http server, to log incoming requests
  const requests: { req: http.IncomingMessage; body: string }[] = [];
  const server = http.createServer((req, res) => {
    const body: any[] = [];
    req.on('readable', () => body.push(req.read()));
    req.on('end', () => {
      requests.push({ req, body: body.join('') });
      res.setHeader('content-type', 'application/json');
      res.write(JSON.stringify({ items: [] }));
      res.statusCode = 200;
      res.end();
    });
  });

  before(async () => {
    await new Promise<void>((resolve) => server.listen(Port, resolve));
    console.log('StartedDebug on http://localhost:' + Port);
  });

  afterEach(() => {
    sandbox.restore();
    pkg.LogShipper.INSTANCE = null;
    pkg.SsmCache.cache.clear();
    requests.length = 0;
  });

  after(async () => server.close());

  it('should expose a handler', () => {
    expect(pkg.handler).to.be.a('function');
  });

  const configMap: Record<string, unknown> = {
    '/es-shipper-config/elastic-fake': { url: 'http://localhost:' + Port, username: 'foo', password: 'bar' },
  };

  const fakeConfig = {
    elastic: '/es-shipper-config/elastic-fake',
    id: EVENT_DATA_ACCOUNT,
    name: 'Fake',
    tags: ['@account'],
    prefix: '@account',
    index: 'weekly',
    logGroups: [{ filter: '**', tags: ['@logGroup'], prefix: '@logGroup', index: 'daily' }],
  } as LogShipperConfigAccount;

  it('should be handle a cloudwatch event', async () => {
    process.env[Env.ConfigUri] = 's3://foo/config-bar';

    const s3Stub = sandbox.stub(pkg.s3, 'getObject').callsFake((args: any) => {
      if (args.Key === 'config-bar') return AwsStub.toS3([fakeConfig]);
      return AwsStub.toS3(toLogStream());
    });

    const ssmStub = sandbox.stub(pkg.ssm, 'getParameter').callsFake((args: any) => AwsStub.toSsm(configMap[args.Name]));

    await new Promise((r) => pkg.handler(getCloudWatchEvent(), {}, r));

    expect(s3Stub.callCount).to.equal(1); // should load config
    expect(s3Stub.getCall(0).args[0]).deep.equal({ Key: 'config-bar', Bucket: 'foo' });
    expect(ssmStub.callCount).to.equal(1); // should load elastic credentials
    expect(ssmStub.getCall(0).args[0]).deep.equal({ Name: fakeConfig.elastic });

    expect(requests.length).equal(1);

    const [{ req, body }] = requests;
    expect(req.headers['authorization']).eq('Basic Zm9vOmJhcg==');
    expect(req.url).equal('/_bulk');
    const lines = body
      .trim()
      .split('\n')
      .map((c) => JSON.parse(c));
    expect(lines.length).equal(6);
  });

  it('should be handle a s3 event', async () => {
    process.env[Env.ConfigUri] = 's3://foo/config-bar';

    const s3Stub = sandbox.stub(pkg.s3, 'getObject').callsFake((args: any) => {
      if (args.Key === 'config-bar') return AwsStub.toS3([fakeConfig]);
      return AwsStub.toS3(toLogStream());
    });

    const ssmStub = sandbox.stub(pkg.ssm, 'getParameter').callsFake((args: any) => AwsStub.toSsm(configMap[args.Name]));

    const s3Event = getS3Event();
    await new Promise((r) => pkg.handler(s3Event, {}, r));

    expect(s3Stub.callCount).to.equal(2); // should load config
    expect(s3Stub.getCall(0).args[0]).deep.equal({ Key: 'config-bar', Bucket: 'foo' });
    expect(s3Stub.getCall(1).args[0]).deep.equal({ Key: 'log-key', Bucket: 'log-bucket' });
    expect(ssmStub.callCount).to.equal(1); // should load elastic credentials
    expect(ssmStub.getCall(0).args[0]).deep.equal({ Name: fakeConfig.elastic });

    expect(requests.length).equal(1);

    const [{ req, body }] = requests;
    expect(req.headers['authorization']).eq('Basic Zm9vOmJhcg==');
    expect(req.url).equal('/_bulk');
    const lines = body
      .trim()
      .split('\n')
      .map((c) => JSON.parse(c));
    expect(lines.length).equal(6);
  });

  it('should resume from a stopped state', async () => {
    process.env[Env.ConfigUri] = 's3://foo/config-bar';

    const s3Stub = sandbox.stub(pkg.s3, 'getObject').callsFake((args: any) => {
      if (args.Key === 'config-bar') return AwsStub.toS3([fakeConfig]);
      return AwsStub.toS3(toLogStream());
    });

    const ssmStub = sandbox.stub(pkg.ssm, 'getParameter').callsFake((args: any) => AwsStub.toSsm(configMap[args.Name]));

    const s3Event = getS3Event();
    await new Promise((r) => pkg.handler(s3Event, {}, r));

    expect(s3Stub.callCount).to.equal(2); // should load config
    expect(s3Stub.getCall(0).args[0]).deep.equal({ Key: 'config-bar', Bucket: 'foo' });
    expect(s3Stub.getCall(1).args[0]).deep.equal({ Key: 'log-key', Bucket: 'log-bucket' });
    expect(ssmStub.callCount).to.equal(1); // should load elastic credentials
    expect(ssmStub.getCall(0).args[0]).deep.equal({ Name: fakeConfig.elastic });

    await new Promise((r) => pkg.handler(s3Event, {}, r));

    expect(s3Stub.callCount).to.equal(3); // Config should not be loaded again
    expect(s3Stub.getCall(0).args[0]).deep.equal({ Key: 'config-bar', Bucket: 'foo' });
    expect(s3Stub.getCall(1).args[0]).deep.equal({ Key: 'log-key', Bucket: 'log-bucket' });
    expect(s3Stub.getCall(2).args[0]).deep.equal({ Key: 'log-key', Bucket: 'log-bucket' });

    expect(ssmStub.callCount).to.equal(1); // should load elastic credentials once
    expect(ssmStub.getCall(0).args[0]).deep.equal({ Name: fakeConfig.elastic });

    expect(requests.length).equal(2);

    const [{ req, body }] = requests;
    expect(req.headers['authorization']).eq('Basic Zm9vOmJhcg==');
    expect(req.url).equal('/_bulk');
    const lines = body
      .trim()
      .split('\n')
      .map((c) => JSON.parse(c));
    expect(lines.length).equal(6);
  });
});
