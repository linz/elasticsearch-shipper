import { ChunkSource, FileInfo, FileSystem } from '@chunkd/core';
import type SSM from 'aws-sdk/clients/ssm';
import { Readable } from 'stream';

export class FsSsm implements FileSystem {
  protocol = 'ssm';
  remote: SSM;

  constructor(remote: SSM) {
    this.remote = remote;
  }

  async read(configUri: string): Promise<Buffer> {
    if (!configUri.startsWith('ssm://')) throw new Error(`Invalid remote path ${configUri}`);
    const configName = configUri.slice('ssm:/'.length); // Need to include the starting slash

    const config = await this.remote.getParameter({ Name: configName }).promise();
    if (config.Parameter == null || config.Parameter.Value == null)
      throw new Error(`Could not retrieve parameter at ${configUri}`);
    return Buffer.from(config.Parameter.Value);
  }

  readStream(): Readable {
    throw new Error('Not Implemented');
  }
  write(): Promise<void> {
    throw new Error('Not Implemented');
  }
  list(): AsyncGenerator<string> {
    throw new Error('Not Implemented');
  }
  listDetails(): AsyncGenerator<FileInfo> {
    throw new Error('Not Implemented');
  }
  exists(): Promise<boolean> {
    throw new Error('Not Implemented');
  }
  head(): Promise<FileInfo | null> {
    throw new Error('Not Implemented');
  }
  stream(): Readable {
    throw new Error('Method not implemented.');
  }
  details(): AsyncGenerator<FileInfo, any, unknown> {
    throw new Error('Method not implemented.');
  }
  source(): ChunkSource {
    throw new Error('Method not implemented.');
  }
}
