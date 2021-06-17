import * as z from 'zod';
import {
  LogShipperConfigAccountValidator,
  LogShipperConfigGroupValidator,
  LogShipperConfigIndexDateValidator,
  LogShipperConfigValidator,
  LogShipperElasticValidator,
} from './config.elastic';

export type LogShipperConfig = z.infer<typeof LogShipperConfigValidator>;
export type LogShipperConnection = z.infer<typeof LogShipperElasticValidator>;
export type LogShipperConfigAccount = z.infer<typeof LogShipperConfigAccountValidator>;
export type LogShipperConfigLogGroup = z.infer<typeof LogShipperConfigGroupValidator>;
export type LogShipperConfigIndexDate = z.infer<typeof LogShipperConfigIndexDateValidator>;
