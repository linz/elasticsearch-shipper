import { LogObject } from '../type';

export const FlowLogRegexp =
  /^[0-9] ([0-9]+|unknown) eni-[0-9a-f]+ ([0-9a-f.:]|-)+ ([0-9a-f.:]|-)+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [0-9]+ [0-9]+ (ACCEPT|REJECT|-) (OK|NODATA|SKIPDATA).*$/;
export const AccessLogRegexp = /^.* .* .* \[.+\] ".+" [0-9]+ [0-9]+ ".*" ".*"$/;
export const LambdaLogRegexp = /(START|REPORT|END) RequestId: [\-0-9a-f]+.*/;
/**
 * Attempt to parse log messages as various types then inject tags
 * @param lo Log to parse
 */
export function onLogTag(lo: LogObject): boolean | void {
  if (lo.message == null) return;
  // Large messages can cause the regexps to explode
  if (lo.message.length > 2048) return;
  if (lo['@tags'] == null) return;
  const tags = lo['@tags'];

  if (lo.message.match(FlowLogRegexp) != null) {
    tags.push('Flow log');
    return true; // Drop flow logs.
  }

  if (lo.message.match(LambdaLogRegexp)) {
    tags.push('Lambda log');
    return;
  }

  if (lo.message.match(AccessLogRegexp) != null) {
    tags.push('Access log');
  }
}
