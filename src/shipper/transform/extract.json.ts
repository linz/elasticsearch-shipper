import { LogTransformRequest, LogTransformResponse } from '../type.js';

/**
 * Find JSON objects inside a string and extract them
 * @param message string to extract from
 */
function extractJson(message: string): Record<string, any> | null {
  const jsonStart = message.indexOf('{');
  if (jsonStart < 0) return null;

  const jsonSubString = message.substring(jsonStart);
  try {
    return JSON.parse(jsonSubString);
  } catch (e) {
    return null;
  }
}

/**
 * Attempt to parse a JSON object from the log message
 *
 * @param ctx Log to transform
 */
export function onLogExtractJson(lo: LogTransformRequest): LogTransformResponse {
  if (lo.original.message == null) return;

  const extracted = extractJson(lo.original.message);
  if (extracted == null) return;

  delete lo.log.message; // JSON logs don't need the raw JSON in the output
  Object.assign(lo.log, extracted);
  return;
}
