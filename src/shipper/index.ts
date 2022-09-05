import 'source-map-support/register';

export { handler, s3 } from './app';
export { ElasticSearch } from './elastic';
export { LogShipper } from './shipper.config';
export { LogObject } from './type';
import { lf } from '@linzjs/lambda';
export const Log = lf.Logger;
