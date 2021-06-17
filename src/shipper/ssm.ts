import SSM from 'aws-sdk/clients/ssm';
import { RefreshTimeoutSeconds } from './shipper.config';

export const ssm = new SSM();

export class SsmCache {
  static cache: Map<string, { value: Promise<unknown>; time: number }> = new Map();

  static get(configName: string): Promise<unknown> {
    let existing = this.cache.get(configName);
    if (existing == null || existing.time + RefreshTimeoutSeconds * 1000 < Date.now()) {
      existing = { value: this.fetch(configName), time: Date.now() };
    }
    return existing.value;
  }

  static async fetch(configName: string): Promise<unknown> {
    const config = await ssm.getParameter({ Name: configName }).promise();
    if (config.Parameter == null) throw new Error(`Could not retrieve parameter at ${configName}`);
    return JSON.parse(config.Parameter.Value as string);
  }
}
