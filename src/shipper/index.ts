export { s3 } from './app.js';
export { ElasticSearch } from './elastic.js';
export { LogShipper } from './shipper.config.js';
export { LogObject } from './type.js';
import { lf } from '@linzjs/lambda';
import { handler } from './app.js';
import { onLogExtractJson } from './transform/extract.json.js';
import { onLogTag } from './transform/tag.js';
import { LogTransformDrop, LogTransformDropType, LogTransformRequest, LogTransformResponse } from './type.js';

export { LogTransformDrop, LogTransformDropType, LogTransformRequest, LogTransformResponse };

export const logHandler = handler;
export const Log = lf.Logger;

export const Transform = {
  /** Transform the log by dropping it */
  Drop: LogTransformDrop,
  /** Attempt to parse the log as JSON */
  extractJson: onLogExtractJson,
  /** Apply tags to the logs based off regexps */
  tag: onLogTag,
} as const;
