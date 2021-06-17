import * as z from 'zod';
import {
  LogShipperConfigAccountValidator,
  LogShipperConfigGroupValidator,
  LogShipperConfigIndexDateValidator,
  LogShipperConfigValidator,
  LogShipperConnectionAwsValidator,
  LogShipperConnectionBasicValidator,
  LogShipperConnectionCloudValidator,
  LogShipperConnectionValidator,
} from './config.elastic';

export type LogShipperConfig = z.infer<typeof LogShipperConfigValidator>;
export type LogShipperConnection = z.infer<typeof LogShipperConnectionValidator>;
export type LogShipperConfigAccount = z.infer<typeof LogShipperConfigAccountValidator>;
export type LogShipperConfigLogGroup = z.infer<typeof LogShipperConfigGroupValidator>;
export type LogShipperConfigIndexDate = z.infer<typeof LogShipperConfigIndexDateValidator>;

export type LogShipperConnectionCloud = z.infer<typeof LogShipperConnectionCloudValidator>;
export type LogShipperConnectionAws = z.infer<typeof LogShipperConnectionAwsValidator>;
export type LogShipperConnectionBasic = z.infer<typeof LogShipperConnectionBasicValidator>;
