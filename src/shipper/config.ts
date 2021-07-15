import { fsa } from '@linzjs/s3fs';
import { RefreshTimeoutSeconds } from './shipper.config';

const RetryDelayMilliseconds = 50;
const RetryCount = 3;

export class ConfigCache {
  static cache: Map<string, { value: Promise<unknown>; time: number }> = new Map();

  static get(configName: string): Promise<unknown> {
    let existing = this.cache.get(configName);
    if (existing == null || existing.time + RefreshTimeoutSeconds * 1000 < Date.now()) {
      existing = { value: this.fetch(configName), time: Date.now() };
    }
    return existing.value;
  }

  static async fetch(configUri: string): Promise<unknown> {
    // TODO this is for backwards compatibility this should be removed once everything is prefixed with a ssm://
    if (configUri.startsWith('/')) configUri = 'ssm:/' + configUri; // all SSM params should have a `/`
    const failures: Error[] = [];
    for (let i = 0; i < RetryCount; i++) {
      try {
        const object = await fsa.read(configUri);
        return JSON.parse(object.toString());
      } catch (e) {
        failures.push(e);
        await new Promise((resolve) => setTimeout(resolve, RetryDelayMilliseconds + i * RetryDelayMilliseconds));
      }
    }
    throw new Error('Failed to read: ' + configUri + ' Reasons:' + failures.map((c) => c.toString()).join('\n'));
  }
}
