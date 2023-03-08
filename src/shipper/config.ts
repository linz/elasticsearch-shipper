import { fsa } from '@chunkd/fs';
import { RefreshTimeoutSeconds } from '../env.js';
import { ElasticSearchOptions } from './elastic.js';

const RetryDelayMilliseconds = 50;
const RetryCount = 3;

export const DefaultOptions: ElasticSearchOptions = {
  dlq: { name: 'dlq', indexDate: 'daily' },
  maxSizeBytes: 4096,
};

export class ConfigCache {
  static cache: Map<string, { value: Promise<unknown>; time: number }> = new Map();
  static options: Map<string, ElasticSearchOptions> = new Map();

  static getOptions(configName: string): ElasticSearchOptions {
    return ConfigCache.options.get(configName) ?? DefaultOptions;
  }

  static get(configName: string): Promise<unknown> {
    let existing = this.cache.get(configName);
    if (existing == null || existing.time + RefreshTimeoutSeconds * 1000 < Date.now()) {
      existing = { value: this.fetch(configName), time: Date.now() };
      this.cache.set(configName, existing);
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
        failures.push(e as Error);
        await new Promise((resolve) => setTimeout(resolve, RetryDelayMilliseconds + i * RetryDelayMilliseconds));
      }
    }
    throw new Error('Failed to read: ' + configUri + ' Reasons:' + failures.map((c) => c.toString()).join('\n'));
  }
}
