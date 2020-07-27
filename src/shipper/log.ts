import { CloudWatchLogsDecodedData, CloudWatchLogsLogEvent } from 'aws-lambda';
export function eventTime(timestamp?: number): string {
  if (timestamp != null) {
    /** Sometimes time is passed in as seconds not ms */
    if (timestamp < 500000000000) timestamp *= 1000;
    return new Date(timestamp).toISOString();
  }
  return new Date().toISOString();
}

export interface LogObject extends Record<string, string | number | string[] | undefined> {
  /** Log Id, generally very long number string
   * @example
   *  '35055947907870703043012542183748618652884187642541965313'
   */
  '@id': string;
  /** ISO 8601 time of the log event */
  '@timestamp': string;

  /** Owner AWS account number */
  '@owner': string;
  /** Source cloudwatch log group */
  '@logGroup': string;
  /** Source cloudwatch log stream */
  '@logStream': string;

  /** Source file */
  '@source'?: string;

  /** Log tags that have been applied from log config */
  '@tags': string[];
}
/**
 * Find JSON objects inside a string and extract them
 * @param message string to extract from
 */
function extractJson(message: string): Record<string, any> | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart < 0) {
    return null;
  }
  const jsonSubString = message.substring(jsonStart);
  try {
    return JSON.parse(jsonSubString);
  } catch (e) {
    return null;
  }
}

export function getLogObject(
  obj: CloudWatchLogsDecodedData,
  log: CloudWatchLogsLogEvent,
  s3Key?: string,
): null | LogObject {
  if (log == undefined) {
    return null;
  }

  const logObj: LogObject = {
    '@id': log.id,
    '@timestamp': new Date(log.timestamp).toISOString(),
    '@owner': obj.owner,
    '@logGroup': obj.logGroup,
    '@logStream': obj.logStream,
    '@source': s3Key,
    '@tags': [],
    message: log.message,
  };

  if (logObj['@timestamp'] === undefined) {
    logObj['@timestamp'] = eventTime();
  }

  try {
    if (
      log.message.match(
        /^[0-9] ([0-9]+|unknown) eni-[0-9a-f]+ ([0-9a-f.:]|-)+ ([0-9a-f.:]|-)+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [\-0-9]+ [0-9]+ [0-9]+ (ACCEPT|REJECT|-) (OK|NODATA|SKIPDATA).*$/,
      ) != null
    ) {
      logObj['@tags'].push('Flow log');
      // Drop flow logs.
      return null;
    } else if (log.message.match(/^.* .* .* \[.+\] ".+" [0-9]+ [0-9]+ ".*" ".*"$/) != null) {
      logObj['@tags'].push('Access log');
    } else if (log.message.match(/(START|REPORT|END) RequestId: [\-0-9a-f]+.*/)) {
      logObj['@tags'].push('Lambda log');
    } else {
      const extracted = extractJson(log.message);
      if (extracted) {
        for (const [key, value] of Object.entries(extracted)) {
          logObj[key] = value;
        }
        // JSON logs don't need the raw JSON in the output
        delete logObj.message;
      }
    }
  } catch (e) {
    logObj['@tags'].push('failed to parse');
  }

  return logObj as LogObject;
}
