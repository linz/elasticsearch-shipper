// import { LogShipperElasticConfig } from './config.elastic';
import * as z from 'zod';
import {
  LogShipperConfigAccountValidator,
  LogShipperConfigGroupValidator,
  LogShipperConfigIndexDateValidator,
  LogShipperConfigValidator,
} from './config.elastic';

export type LogShipperConfig = z.infer<typeof LogShipperConfigValidator>;
export type LogShipperConfigAccount = z.infer<typeof LogShipperConfigAccountValidator>;
export type LogShipperConfigLogGroup = z.infer<typeof LogShipperConfigGroupValidator>;
export type LogShipperConfigIndexDate = z.infer<typeof LogShipperConfigIndexDateValidator>;
