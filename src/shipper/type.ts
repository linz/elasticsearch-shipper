import { CloudWatchLogsLogEvent } from 'aws-lambda';
import { LogShipperConfigIndexDate } from '../config/config';

export interface LogObject extends Record<string, string | number | string[] | boolean | undefined> {
  /** Log Id, generally very long number string
   * @example
   *  '35055947907870703043012542183748618652884187642541965313'
   */
  '@id': string;
  /** ISO 8601 time of the log event */
  '@timestamp': string;
  /** Timestamp when this log was found by the log shipper */
  '@timestampShipped': string;
  /** ULID of the shipper request */
  '@shipperId'?: string;
  /** Owner AWS account number */
  '@owner': string;
  /** Source cloudwatch log group */
  '@logGroup': string;
  /** Source cloudwatch log stream */
  '@logStream': string;
  /** Source file */
  '@source'?: string;
  /** Log tags that have been applied from log config */
  '@tags'?: string[];
  /**
   * The raw message that came from cloudwatch
   *
   * If the log is processed as JSON this message is deleted
   */
  message?: string;
}

/**
 * Modify each log line
 *
 * @returns true to drop the log line
 */
export type LogProcessFunction = (logObject: LogObject) => boolean | void;

export const LogFunctionName = `log-fns.js`;

/** Drop a log inside a transformation */
export const LogTransformDrop = Symbol('LogDrop');
export type LogTransformDropType = typeof LogTransformDrop;

/** The result of the transformation */
export type LogTransformResponse = LogTransformDropType | undefined;

export interface LogTransformRequest {
  /** Extracted log object */
  log: LogObject;
  /** How to group the prefix */
  indexDate: LogShipperConfigIndexDate;
  /** Original log message */
  original: CloudWatchLogsLogEvent;
  /** Index prefix */
  prefix: string;
}
