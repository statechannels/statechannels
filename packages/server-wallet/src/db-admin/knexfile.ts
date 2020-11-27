/* eslint-disable no-process-env */
import * as path from 'path';

import {Config} from 'knex';

import {
  defaultConfig,
  defaultDatabaseConfiguration,
  extractDBConfigFromServerWalletConfig,
  ServerWalletConfig,
} from '../config';

// Populate env vars as knexfile is used directly in yarn scripts
// TODO: We should not need to depend on devtools at this step.
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

const BASE_PATH = path.join(__dirname, '..', 'db');
const extensions = [path.extname(__filename)];
export function createKnexConfig(walletConfig: ServerWalletConfig): Config<any> {
  return {
    ...extractDBConfigFromServerWalletConfig(walletConfig),
    debug: walletConfig.databaseConfiguration.debug,
    migrations: {
      directory: path.join(BASE_PATH, 'migrations'),
      loadExtensions: extensions,
    },
    seeds: {
      directory: path.join(BASE_PATH, 'seeds'),
      loadExtensions: extensions,
    },
    /**
     * To safely run migrations, we cannot use knexSnakeCaseMappers in the knex config
     * https://github.com/Vinci≠t/objection.js/issues/1144
     * So, in our admin knex config, which is used for running migrations, we
     * overwrite the two config options set by knexSnakeCaseMappers
     */
    postProcessResponse: undefined,
    wrapIdentifier: undefined,
  };
}

// We use env vars here so the migration can be easily controlled from the console
const dbConnectionConfig = process.env.SERVER_URL || {
  host: process.env.SERVER_HOST || defaultDatabaseConfiguration.connection.host,
  port: Number(process.env.SERVER_PORT) || defaultDatabaseConfiguration.connection.port,
  database: process.env.SERVER_DB_NAME || '',
  user: process.env.SERVER_DB_USER || 'postgres', // Default to postgres so the command will work in most cases without specifying a user
  password: process.env.SERVER_DB_PASSWORD,
};

const dbDebug = process.env.DEBUG_KNEX?.toLowerCase() === 'true' || false;

export const {client, connection, debug, migrations, seeds, pool} = createKnexConfig({
  ...defaultConfig,
  databaseConfiguration: {debug: dbDebug, connection: dbConnectionConfig},
  ethereumPrivateKey: '0x0',
  networkConfiguration: {
    chainNetworkID: 0,
  },
});
