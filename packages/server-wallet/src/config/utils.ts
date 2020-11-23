/* eslint-disable no-process-env */
import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import {parse} from 'pg-connection-string';
import {Level} from 'pino';

import {defaultDatabaseConfiguration, defaultTestConfig, DEFAULT_DB_NAME} from './defaults';
import {ServerWalletConfig, DatabaseConnectionConfiguration} from './types';

function readBoolean(envValue: string | undefined, defaultValue?: boolean): boolean {
  if (!envValue) return defaultValue || false;
  return envValue?.toLowerCase() === 'true';
}
function readInt(envValue: string | undefined, defaultValue?: number): number {
  if (!envValue) return defaultValue || 0;
  return Number.parseInt(envValue);
}

export function overwriteConfigWithEnvVars(config: ServerWalletConfig): ServerWalletConfig {
  return {
    databaseConfiguration: {
      connection: process.env.SERVER_URL || {
        host: process.env.SERVER_HOST || defaultDatabaseConfiguration.connection.host,
        port: Number(process.env.SERVER_PORT) || defaultDatabaseConfiguration.connection.port,
        dbName: process.env.SERVER_DB_NAME || '',
        user: process.env.SERVER_DB_USER,
        password: process.env.SERVER_DB_PASSWORD,
      },
      debug: readBoolean(process.env.DEBUG_KNEX, config.databaseConfiguration.debug),
    },
    metricConfiguration: {
      timingMetrics: readBoolean(
        process.env.TIMING_METRICS,
        config.metricConfiguration.timingMetrics
      ),
      metricsOutputFile: process.env.METRICS_OUTPUT_FILE,
    },

    stateChannelPrivateKey: process.env.STATE_CHANNEL_PRIVATE_KEY || config.stateChannelPrivateKey,
    ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || config.ethereumPrivateKey,
    networkConfiguration: {
      rpcEndpoint: process.env.RPC_ENDPOINT,
      chainNetworkID: process.env.CHAIN_NETWORK_ID || '0x00',
      ethAssetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
      erc20Address: process.env.ERC20_ADDRESS,
      erc20AssetHolderAddress: process.env.ERC20_ASSET_HOLDER_ADDRESS,
    },

    skipEvmValidation: (process.env.SKIP_EVM_VALIDATION || 'true').toLowerCase() === 'true',

    workerThreadAmount: readInt(process.env.AMOUNT_OF_WORKER_THREADS, config.workerThreadAmount),
    loggingConfiguration: {
      logLevel: (process.env.LOG_LEVEL as Level) || config.loggingConfiguration.logLevel,
      logDestination: process.env.LOG_DESTINATION || config.loggingConfiguration.logDestination,
    },
  };
}

export function extractDBConfigFromServerWalletConfig(
  serverWalletConfig: ServerWalletConfig
): Config {
  const connectionConfig = getDatabaseConnectionConfig(serverWalletConfig);

  return {
    client: 'postgres',
    // TODO: Might make sense to use `database` instead of `dbName` so its consitent with knex
    connection: {...connectionConfig, database: connectionConfig.dbName},
    ...knexSnakeCaseMappers(),
    pool: serverWalletConfig.databaseConfiguration.pool || {},
  };
}

export function createTestConfig(databaseName: string): ServerWalletConfig {
  const {host, port} = defaultTestConfig.databaseConfiguration.connection;

  return {
    ...defaultTestConfig,
    databaseConfiguration: {
      ...defaultTestConfig.databaseConfiguration,
      connection: {host, port, dbName: databaseName || DEFAULT_DB_NAME},
    },
  };
}
type DatabaseConnectionConfigObject = Exclude<DatabaseConnectionConfiguration, string>;
export function getDatabaseConnectionConfig(
  config: ServerWalletConfig
): DatabaseConnectionConfigObject {
  if (typeof config.databaseConfiguration.connection === 'string') {
    const {connection: defaultConnection} = defaultDatabaseConfiguration;
    const {port, host, user, database, password} = parse(config.databaseConfiguration.connection);
    return {
      port: port ? parseInt(port) : defaultConnection.port,
      host: host || defaultConnection.host,
      dbName: database || '',
      user,
      password,
    };
  } else {
    // TODO: Sort out the typing
    return config.databaseConfiguration.connection as DatabaseConnectionConfigObject;
  }
}
