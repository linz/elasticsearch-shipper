import { expect } from 'chai';
import { existsSync } from 'fs';
import { SourceCode } from '../index';

describe('Infrastructure', () => {
  it('should point at a distribution file that exists', () => {
    const exists = existsSync(SourceCode);
    if (process.env.CI == null && exists == false) {
      console.warn('No bundled code found ' + SourceCode);
      return;
    }
    expect(exists).equal(true);
  });
});
