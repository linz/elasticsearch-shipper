import { expect } from 'chai';
import { LogObject } from '../../type.js';
import { onLogTag } from '../tag.js';

describe('onLogTag', () => {
  let msg = { message: '' } as LogObject;
  beforeEach(() => {
    const tags: string[] = [];
    msg = { message: '', '@tags': tags } as LogObject;
  });

  for (const line of [
    'END RequestId: be0262fa-d7f9-47b8-985e-9bb41e77b624',
    'REPORT RequestId: be0262fa-d7f9-47b8-985e-9bb41e77b624	Duration: 10.23 ms	Billed Duration: 11 ms	Memory Size: 2048 MB	Max Memory Used: 385 MB',
    'START RequestId: be0262fa-d7f9-47b8-985e-9bb41e77b624 Version: $LATEST',
  ]) {
    const reqType = line.split(' ')[0];
    it('should tag lambda logs :' + reqType, () => {
      msg.message = line;
      const ret = onLogTag(msg);
      expect(ret).to.eq(undefined);
      expect(msg['@tags']).deep.eq(['Lambda log']);
    });
  }

  it('should drop flow logs', () => {
    msg.message =
      '2 418528898914 eni-ababababb 255.255.255.222 255.255.255.159 443 36215 6 17 6419 1630295292 1630295304 ACCEPT OK';
    const ret = onLogTag(msg);
    expect(ret).to.eq(true);
    expect(msg['@tags']).deep.eq(['Flow log']);
  });

  it('should skip large log lines', () => {
    msg.message = 'END RequestId: be0262fa-d7f9-47b8-985e-9bb41e77b624'.padEnd(2049, '-');
    const ret = onLogTag(msg);
    expect(ret).to.eq(undefined);
    expect(msg['@tags']).deep.eq(['Oversized log']);
  });

  it('should not die when getting a weird message', () => {
    expect(onLogTag({ '@tags': [], message: null } as any)).equal(undefined);
    expect(onLogTag({ '@tags': [], message: {} } as any)).equal(undefined);
    expect(onLogTag({ '@tags': [], message: [] } as any)).equal(undefined);
    expect(onLogTag({ '@tags': [], message: 1 } as any)).equal(undefined);
    expect(onLogTag({ '@tags': [], message: () => null } as any)).equal(undefined);
    expect(onLogTag({ '@tags': [], message: new Error() } as any)).equal(undefined);
  });

  it('should not skip largeish log lines', () => {
    msg.message = 'END RequestId: be0262fa-d7f9-47b8-985e-9bb41e77b624'.padEnd(2048, '-');
    const ret = onLogTag(msg);
    expect(ret).to.eq(undefined);
    expect(msg['@tags']).deep.eq(['Lambda log']);
  });

  it('should parse access log lines', () => {
    msg.message =
      '1.2.3.4 - - [31/Aug/2021:01:45:31 +0000] "GET /ping HTTP/1.1" 200 0 "-" "ELB-HealthChecker/2.0" "1.2.3.4"';
    accessLogTest(msg);
  });

  it('should parse access log lines with no bytes', () => {
    msg.message =
      '1.2.3.4 - - [31/Aug/2021:01:45:31 +0000] "GET /ping HTTP/1.1" 200 - "-" "ELB-HealthChecker/2.0" "1.2.3.4"';
    accessLogTest(msg);
  });

  it('should accept a combined log format message', () => {
    msg.message =
      '127.0.0.1 user-identifier frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326 "https://google.com" "curl/1.2.3"';
    accessLogTest(msg);
  });

  it('should accept a common log format message', () => {
    msg.message = '127.0.0.1 user-identifier frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326';
    accessLogTest(msg);
  });
});

function accessLogTest(msg: LogObject): void {
  const ret = onLogTag(msg);
  expect(ret).to.eq(undefined);
  expect(msg['@tags']).deep.eq(['Access log']);
}
