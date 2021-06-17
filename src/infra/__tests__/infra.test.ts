/* eslint-disable @typescript-eslint/no-var-requires */
import { expect } from 'chai';
import { existsSync } from 'fs';
import { SourceCode } from '../index';

describe('Infrastructure', () => {
  const exists = existsSync(SourceCode);
  if (process.env.CI == null && exists === false) {
    console.warn('No bundled code found ' + SourceCode);
    return;
  }

  it('should point at a distribution file that exists', () => {
    expect(exists).equal(true);
  });
});
