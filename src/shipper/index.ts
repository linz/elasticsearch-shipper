export { s3 } from './app';
export { ElasticSearch } from './elastic';
export { LogShipper } from './shipper.config';
export { LogObject } from './type';
import { lf } from '@linzjs/lambda';
import { handler } from './app';

export const logHandler = handler;
export const Log = lf.Logger;
