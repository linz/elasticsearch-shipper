/**
 * Configure a log shipper lambda function
 *
 * Log shipper config is stored inside of AWS parameter store
 */

import pino from 'pino';
import { PrettyTransform } from 'pretty-json-log';
import { Env, DefaultParameterStoreBasePath } from '../env';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { LogShipperConfigValidator } from '../config/config.elastic';
import { LogShipperConfig } from '../config/config';
import * as JDP from 'jsondiffpatch';

const ssm = new AWS.SSM({ region: 'ap-southeast-2' });

const CONFIG_NAME = process.env[Env.ConfigName] ?? DefaultParameterStoreBasePath;

const logger = process.stdout.isTTY ? pino(PrettyTransform.stream()) : pino();
logger.level = 'debug';

function usage(err?: string): void {
  if (err) console.log(err, '\n');
  console.log('Usage: ');
  console.log('./config [--import :fileName] [--export :fileName] [--commit]');
  console.log('\t --export - export current config');
  console.log('\t --import - import from "./config.json"');
  console.log('\t --commit - commit changes');
}

/** Lookup the current config, attempt to parse it as a log shipper config */
async function fetchCurrentConfig(configName: string): Promise<LogShipperConfig | null> {
  logger.debug({ configName }, 'FetchCurrentConfig');
  const fetchPromise = ssm
    .getParameter({ Name: configName })
    .promise()
    .catch((e) => {
      if (e.code == 'ParameterNotFound') return null;
      throw e;
    });
  const value = await fetchPromise;
  if (value == null || value.Parameter == null || value.Parameter.Value == null) {
    logger.warn({ configName }, 'NoConfigFound');
    return null;
  }

  const jsonData = JSON.parse(value.Parameter.Value);

  try {
    const validated = LogShipperConfigValidator.parse(jsonData);
    logger.info({ configName, accounts: validated.accounts.map((c) => c.name + '-' + c.id) }, 'Validated');
    return validated;
  } catch (e) {
    logger.warn(e, 'Failed to validated config');
  }
  return jsonData;
}

async function main(): Promise<void> {
  const isImport = process.argv.includes('--import');
  const isCommit = process.argv.includes('--commit');
  const isExport = process.argv.includes('--export');
  // TODO should we really just look for a filename like this
  const fileName = process.argv.slice(2).find((f) => f.includes('.'));

  if (isExport && isImport) return usage('Cannot use both --import and --export');
  if (!isExport && !isImport) return usage('Missing --import or --export');
  if (fileName == null) return usage('Unable to find file path to import/export');

  const configName = CONFIG_NAME;
  logger.info({ configName, fileName, isExport, isImport }, 'Using config');

  const currentData = await fetchCurrentConfig(configName);

  if (isExport) {
    logger.info({ fileName }, 'Exporting file');

    await fs.promises.writeFile(fileName, JSON.stringify(currentData, null, 2));
  }

  if (isImport) {
    const fileData = await fs.promises.readFile(fileName);
    const jsonData = JSON.parse(fileData.toString());

    const validated = LogShipperConfigValidator.parse(jsonData);
    if (validated.accounts.length == 0) throw new Error('No config data found');
    logger.info({ configName, accounts: validated.accounts.map((c) => c.name + '-' + c.id), fileName }, 'Validated');

    const diff = JDP.diff(currentData, validated);
    if (diff == null) return logger.warn('NoChanges');

    console.log(JDP.formatters.console.format(diff, currentData));

    if (isCommit) {
      logger.info({ configName }, 'Updating config');
      await ssm
        .putParameter({ Name: configName, Overwrite: true, Value: JSON.stringify(validated, null, 2), Type: 'String' })
        .promise();
    } else {
      logger.warn({ configName }, 'DryRun Done');
    }
  }
}

main().catch((e) => logger.fatal(e, 'Failed'));
