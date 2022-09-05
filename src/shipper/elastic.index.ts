import { LogShipperConfigIndexDate } from '../config/config.js';

/**
 * Number of characters needed to extract from a ISO string
 * daily: `2019-02-02` - 10 characters
 * monthly: `2019-02` - 7 characters
 * yearly: `2019` - 4 characters
 */
const ISO_DAY_INDEX = 10;
const ISO_MONTH_INDEX = 7;
const ISO_YEAR_INDEX = 4;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
/**
 * Get the index date format for the specified index type
 *
 * @param dateIso Log date to get index name for
 * @param indexType date indexing strategy
 */
export function getIndexDate(dateIso: string, indexType: LogShipperConfigIndexDate): string {
  if (indexType === 'daily') {
    return dateIso.slice(0, ISO_DAY_INDEX);
  }

  // Weekly is just a shortcut to rounding to the closes 7 days
  if (indexType === 'weekly') {
    indexType = 7;
  }

  // Round down to the nearest day increment
  if (typeof indexType === 'number') {
    const date = new Date(dateIso);
    const offset = indexType * ONE_DAY_MS;
    const outputDate = new Date(Math.floor(date.getTime() / offset) * offset);
    return outputDate.toISOString().slice(0, ISO_DAY_INDEX);
  }

  if (indexType === 'monthly') return dateIso.slice(0, ISO_MONTH_INDEX);
  if (indexType === 'yearly') return dateIso.slice(0, ISO_YEAR_INDEX);

  throw new Error(`Invalid elastic index type: ${indexType}`);
}
