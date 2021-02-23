import { CloudWatchLogsLogEvent } from 'aws-lambda';
import { expect } from 'chai';
import { LogShipper } from '../shipper.config';
import { LogObject } from '../type';

describe('LogProcess', () => {
  let runCount = 0;

  let shipper: LogShipper;
  beforeEach(() => {
    runCount = 0;
    shipper = new LogShipper({} as any);
    shipper.onLog.push((lo: LogObject): boolean => {
      runCount++;
      if (lo.drop === true || lo.drop === 'true') return true;
      return false;
    });
  });

  const logEvent = {
    owner: 'owner',
    logGroup: 'logGroup',
    logStream: 'logStream',
    subscriptionFilters: ['Something'],
    messageType: 'messageType',
    logEvents: [],
  };

  function logLine(message: Record<string, unknown>): CloudWatchLogsLogEvent {
    return {
      id: '1',
      timestamp: Date.now(),
      message: JSON.stringify(message),
    };
  }

  it('should drop if a filter exists', () => {
    const logs = shipper.getLogObject(logEvent, logLine({ drop: false }));
    expect(logs).to.not.eq(null);
    expect(runCount).to.eq(1);

    const logDrop = shipper.getLogObject(logEvent, logLine({ drop: true }));
    expect(logDrop).to.eq(null);
    expect(runCount).to.eq(2);
  });
});
