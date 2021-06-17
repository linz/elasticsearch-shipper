import 'source-map-support/register';

export { LambdaLogShipperFunction } from './infra';
export { LogObject, LogProcessFunction } from './shipper/type';
export * from './config/config.elastic';
export * from './config/config';
