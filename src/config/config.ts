import * as z from 'zod';
import { LogObject } from '../shipper';
import {
  LogShipperConfigAccountValidator,
  LogShipperConfigGroupValidator,
  LogShipperConfigIndexDateValidator,
  LogShipperConnectionAwsValidator,
  LogShipperConnectionBasicValidator,
  LogShipperConnectionCloudValidator,
  LogShipperConnectionValidator,
} from './config.elastic';

/** optional filter  */
export type LogShipperTransform = (logOject: LogShipperContext) => true | undefined;

export type LogShipperTransformer = {
  transform?: LogShipperTransform;
};

export interface LogShipperContext {
  log: LogObject;
  index: LogShipperConfigIndexDate;
  prefix: string;
}

export type LogShipperConnection = z.infer<typeof LogShipperConnectionValidator>;
export type LogShipperConfigAccount = z.infer<typeof LogShipperConfigAccountValidator> & LogShipperTransformer;
export type LogShipperConfigLogGroup = z.infer<typeof LogShipperConfigGroupValidator>;
export type LogShipperConfigIndexDate = z.infer<typeof LogShipperConfigIndexDateValidator>;

export type LogShipperConnectionCloud = z.infer<typeof LogShipperConnectionCloudValidator>;
export type LogShipperConnectionAws = z.infer<typeof LogShipperConnectionAwsValidator>;
export type LogShipperConnectionBasic = z.infer<typeof LogShipperConnectionBasicValidator>;

export interface LogShipperConfigGroup {
  name: string;
  accounts: LogShipperConfigAccount[];
}

export function validateConfig(cfg: LogShipperConfigGroup[] | LogShipperConfigGroup): {
  accounts: LogShipperConfigAccount[];
  elasticIds: Set<string>;
} {
  const elasticIds = new Set<string>();
  const configs = Array.isArray(cfg) ? cfg : [cfg];
  const accounts: LogShipperConfigAccount[] = [];

  // Load all configs into S3 and validate that they are valid configs
  for (const config of configs) {
    for (const cfg of config.accounts) {
      const validation = LogShipperConfigAccountValidator.safeParse(cfg);
      if (validation.success === false) throw new Error(`Failed to validate ${config.name}:${cfg.name}`);
      elasticIds.add(validation.data.elastic);
      accounts.push(cfg);
    }
  }

  return { accounts, elasticIds };
}
