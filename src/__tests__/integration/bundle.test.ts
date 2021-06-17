import { expect } from 'chai';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import sinon from 'sinon';
import { LogShipperConfigAccount } from '../../config/config';
import { EVENT_DATA_ACCOUNT } from '../event.data';
import { getCloudWatchEvent, toLogStream } from '../log.data';
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
    requests.length = 0;
  });

  after(async () => server.close());

  it('should expose a handler', () => {
    expect(pkg.handler).to.be.a('function');
  });

  const configMap: Record<string, unknown> = {
    '/es-shipper-config/accounts': ['/es-shipper-config/fake'],
    '/es-shipper-config/elastic-fake': { url: 'http://localhost:' + Port, username: 'foo', password: 'bar' },
  };

  it('should be invokeable', async () => {
    const fakeConfig = {
      elastic: '/es-shipper-config/elastic-fake',
      id: EVENT_DATA_ACCOUNT,
      name: 'Fake',
      tags: ['@account'],
      prefix: '@account',
      index: 'weekly',
      logGroups: [{ filter: '**', tags: ['@logGroup'], prefix: '@logGroup', index: 'daily' }],
    } as LogShipperConfigAccount;
    configMap['/es-shipper-config/fake'] = fakeConfig;
    sandbox.stub(pkg.SsmCache, 'get').callsFake(async (k) => configMap[k]);

    const s3Return = { promise: () => Promise.resolve({ Body: toLogStream() }) } as any;
    const s3Stub = sandbox.stub(pkg.S3, 'getObject') as any;
    s3Stub.returns(s3Return);

    await pkg.handler(getCloudWatchEvent());

    expect(s3Stub.callCount).to.equal(0);
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
});
