export { s3 } from './app.js';
export { ElasticSearch } from './elastic.js';
export { LogShipper } from './shipper.config.js';
export { LogObject } from './type.js';
import { lf } from '@linzjs/lambda';
import { handler } from './app.js';

export const logHandler = handler;
export const Log = lf.Logger;
