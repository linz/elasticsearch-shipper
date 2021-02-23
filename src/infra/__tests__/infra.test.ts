/* eslint-disable @typescript-eslint/no-var-requires */
import { expect } from 'chai';
import { existsSync } from 'fs';
import { LogObject } from '../../shipper/type';
import { LambdaLogShipperFunction, SourceCode, SourceCodeExtension } from '../index';

describe('Infrastructure', () => {
  const exists = existsSync(SourceCode);
  if (process.env.CI == null && exists === false) {
    console.warn('No bundled code found ' + SourceCode);
    return;
  }

  it('should point at a distribution file that exists', () => {
    expect(exists).equal(true);
  });

  it('should inject additional log processing functions', () => {
    LambdaLogShipperFunction.injectLogFunctions((lo: LogObject): boolean | void => {
      if (lo.dropLog) return true;
    });

    expect(existsSync(SourceCodeExtension)).eq(true);

    const functions = require(SourceCodeExtension);
    expect(Array.isArray(functions)).eq(true);
    expect(functions.length).eq(1);
    expect(functions[0]({ dropLog: true })).eq(true);
    expect(functions[0]({ dropLog: false })).eq(undefined);

    // Un cache the bundled code
    delete require.cache[require.resolve(SourceCode + '/index.js')];
    const bundleJavascript = require(SourceCode + '/index.js');

    expect(bundleJavascript.LogShipper.DefaultLogProcessFunctions.length).eq(3);
    const func3 = bundleJavascript.LogShipper.DefaultLogProcessFunctions[2];
    expect(func3({ dropLog: true })).eq(true);
    expect(func3({ dropLog: false })).eq(undefined);

    LambdaLogShipperFunction.injectLogFunctions();
    expect(existsSync(SourceCodeExtension)).eq(false);

    // Un cache the bundled code
    delete require.cache[require.resolve(SourceCodeExtension)];
    delete require.cache[require.resolve(SourceCode + '/index.js')];
    const bundleJavascriptB = require(SourceCode + '/index.js');
    expect(bundleJavascriptB.LogShipper.DefaultLogProcessFunctions.length).eq(2);
  });
});
