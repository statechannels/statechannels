/* eslint-disable no-process-env */
import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import {parse} from 'pg-connection-string';
import {Level} from 'pino';

import {defaultDatabaseConfiguration, DEFAULT_DB_USER} from './defaults';
import {
  ServerWalletConfig,
  DatabaseConnectionConfiguration,
  OptionalServerWalletConfig,
} from './types';

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
    connection: {
      ...connectionConfig,
      database: connectionConfig.dbName,
      user: connectionConfig.user || DEFAULT_DB_USER,
    },
    ...knexSnakeCaseMappers(),
    pool: serverWalletConfig.databaseConfiguration.pool || {},
  };
}
type DatabaseConnectionConfigObject = Required<Exclude<DatabaseConnectionConfiguration, string>>;

export function overwriteConfigWithDatabaseConnection(
  config: OptionalServerWalletConfig,
  databaseConnectionConfig: DatabaseConnectionConfiguration
): ServerWalletConfig {
  return {
    ...config,
    databaseConfiguration: {
      ...config.databaseConfiguration,
      connection: isDatabaseConfigObject(databaseConnectionConfig)
        ? {
            host: databaseConnectionConfig.host || defaultDatabaseConfiguration.connection.host,
            port: databaseConnectionConfig.port || defaultDatabaseConfiguration.connection.port,
            dbName: databaseConnectionConfig.dbName,
            user: databaseConnectionConfig.user || defaultDatabaseConfiguration.connection.user,
            password: databaseConnectionConfig.password || '',
          }
        : (databaseConnectionConfig as string),
    },
  };
}

function isDatabaseConfigObject(
  connectionConfig: DatabaseConnectionConfiguration
): connectionConfig is DatabaseConnectionConfigObject {
  return typeof connectionConfig !== 'string';
}

export function getDatabaseConnectionConfig(
  config: ServerWalletConfig
): DatabaseConnectionConfigObject & {host: string; port: number} {
  if (typeof config.databaseConfiguration.connection === 'string') {
    const {connection: defaultConnection} = defaultDatabaseConfiguration;
    const {port, host, user, database, password} = parse(config.databaseConfiguration.connection);
    return {
      port: port ? parseInt(port) : defaultConnection.port,
      host: host || defaultConnection.host,
      dbName: database || '',
      user: user || defaultConnection.user,
      password: password || '',
    };
  } else {
    // TODO: Sort out the typing
    return config.databaseConfiguration.connection as DatabaseConnectionConfigObject;
  }
}
