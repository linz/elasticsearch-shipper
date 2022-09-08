import { Transform } from '../index.js';
import { LogTransformRequest, LogTransformResponse } from '../type.js';

export const FlowLogRegexp =
  /^[0-9] ([0-9]+|unknown) eni-[0-9a-f]+ ([0-9a-f.:]|-)+ ([0-9a-f.:]|-)+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [0-9]+ [0-9]+ (ACCEPT|REJECT|-) (OK|NODATA|SKIPDATA).*$/;
export const AccessLogRegexp =
  /^\S+ \S+ \S+ \[[^\]]+\] "[A-Z]+ [^ "]+? HTTP\/[0-9.]+" [0-9]{3} [0-9-]+(?: "\S+"){0,3}$/;
export const LambdaLogRegexp = /(START|REPORT|END) RequestId: [\-0-9a-f]+.*/;
/**
 * Attempt to parse log messages as various types then inject tags
 *
 * @param req Log to transform
 */
export function onLogTag(req: LogTransformRequest): LogTransformResponse {
  const lo = req.original;
  if (lo.message == null) return;
  if (typeof lo.message !== 'string') return;
  if (req.log['@tags'] == null) return;
  const tags = req.log['@tags'];

  // Large messages can cause the regexps to explode
  if (lo.message.length > 2048) {
    tags.push('Oversized log');
    return;
  }

  if (lo.message.match(FlowLogRegexp) != null) return Transform.Drop; // Drop flow logs.

  if (lo.message.match(LambdaLogRegexp)) {
    tags.push('Lambda log');
    return;
  }

  if (lo.message.match(AccessLogRegexp) != null) {
    tags.push('Access log');
  }
  return;
}
