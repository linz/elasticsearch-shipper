export { Log, version, hash } from '../logger';
export { handler, S3 } from './app';
export { ElasticSearch } from './elastic';
export { LogShipper } from './shipper.config';
export { LogObject } from './type';

// Inject additional log functions if there some provided
import { LogShipper } from './shipper.config';
import { LogFunctionName } from './type';
try {
  const AdditionalLogFuncs = require(`./${LogFunctionName}`) ?? [];
  for (const fn of AdditionalLogFuncs) LogShipper.DefaultLogProcessFunctions.push(fn);
} catch (e) {
  //ignore
}
