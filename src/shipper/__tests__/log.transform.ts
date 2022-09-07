import { LogObject, LogTransformRequest } from '../type.js';

export function createRequest(lo: LogObject, prefix = 'prefix', indexDate = 7): LogTransformRequest {
  return {
    log: lo,
    prefix,
    indexDate,
    original: {
      id: Math.random().toString(32),
      timestamp: Number(lo['@timestamp'] ?? Date.now()),
      message: JSON.stringify(lo),
    },
  };
}
