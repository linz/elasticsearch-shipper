import { LogObject } from '../type';

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
 * @param lo Log to parse
 */
export function onLogExtractJson(lo: LogObject): boolean | void {
  if (lo.message == null) return;

  const extracted = extractJson(lo.message);
  if (extracted == null) return;

  delete lo.message; // JSON logs don't need the raw JSON in the output
  Object.assign(lo, extracted);

  return;
}
