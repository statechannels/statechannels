import * as path from 'path';

import {Config} from 'knex';

// Populate env vars as knexfile is used directly in yarn scripts
// FIXME We should not need to depend on devtools at this step.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('@statechannels/devtools').configureEnvVariables();
} catch (err) {
  if (/Cannot find module '@statechannels\/devtools'/.test(err.message))
    console.warn(`
WARNING: @statechannels/devtools not detected.
         Ensure required env variables are properly configured in the shell.
    `);
  else throw err;
}

import {processEnvConfig, extractDBConfigFromServerWalletConfig} from '../config';

const BASE_PATH = path.join(__dirname, '..', 'db');
const extensions = [path.extname(__filename)];

let knexConfig: Config = {
  ...extractDBConfigFromServerWalletConfig(processEnvConfig),
  debug: processEnvConfig.debugKnex === 'TRUE',
  migrations: {
    directory: path.join(BASE_PATH, 'migrations'),
    loadExtensions: extensions,
  },
  seeds: {
    directory: path.join(BASE_PATH, 'seeds'),
    loadExtensions: extensions,
  },
  /**
   * SEE: db-admin-connection.ts
   * To safely run migrations, we cannot use knexSnakeCaseMappers in the knex config
   * https://github.com/Vincit/objection.js/issues/1144
   * So, in our admin knex config, which is used for running migrations, we
   * overwrite the two config options set by knexSnakeCaseMappers
   */
  postProcessResponse: undefined,
  wrapIdentifier: undefined,
};

if (processEnvConfig.nodeEnv === 'development') {
  knexConfig = {...knexConfig, pool: {min: 0, max: 1}};
}

export const {client, connection, debug, migrations, seeds, pool} = knexConfig;
