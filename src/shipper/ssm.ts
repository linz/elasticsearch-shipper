import SSM from 'aws-sdk/clients/ssm';
import { RefreshTimeoutSeconds } from './shipper.config';

export const ssm = new SSM();

const RetryDelay = 50;
const RetryCount = 3;

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
    const failures: Error[] = [];
    for (let i = 0; i < RetryCount; i++) {
      try {
        const config = await ssm.getParameter({ Name: configName }).promise();
        if (config.Parameter == null) throw new Error(`Could not retrieve parameter at ${configName}`);
        return JSON.parse(config.Parameter.Value as string);
      } catch (e) {
        failures.push(e);
        await new Promise((resolve) => setTimeout(resolve, RetryDelay + i * RetryDelay));
      }
    }
    throw new Error('Failed to read: ' + configName + ' Reasons:' + failures.map((c) => c.toString()).join('\n'));
  }
}
