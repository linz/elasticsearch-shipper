'use strict';
import { expect } from 'chai';
import { eventTime } from '../../shipper/log';
import { splitJsonString } from '../../shipper/log.handle';

describe('splitJSONString', () => {
  it('works without a callback', () => {
    const result = splitJsonString('{a}{b}{c}');
    expect(result).to.be.an('Array');
    expect(result).to.have.lengthOf(3);
    expect(result).to.deep.equal(['{a}', '{b}', '{c}']);
  });
});

describe('eventTime', () => {
  it('should give current time', () => {
    const now = Date.now();
    const currentTime = eventTime();
    // should be approximately about now
    expect(now - new Date(currentTime).getTime()).below(10);
  });

  it('should handle ms', () => {
    const now = Date.now();
    const currentTime = eventTime(now);

    expect(now).to.equal(new Date(currentTime).getTime());
  });

  it('should handle seconds', () => {
    const now = Date.now() / 1000;
    const currentTime = eventTime(now);

    expect(now * 1000).to.equal(new Date(currentTime).getTime());
  });
});
