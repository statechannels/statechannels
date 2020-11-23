import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import * as pino from 'pino';
import {parse} from 'pg-connection-string';
/**
 * Database config
 */

export type DatabaseConnectionConfiguration = RequiredConnectionConfiguration &
  Partial<OptionalConnectionConfiguration>;

export type RequiredConnectionConfiguration = {dbName: string} | string;
export type OptionalConnectionConfiguration =
  | {host: string; port: number; user?: string; password?: string}
  | string;

export type DatabasePoolConfiguration = {max?: number; min?: number};

export type RequiredDatabaseConfiguration = {connection: RequiredConnectionConfiguration};
export type OptionalDatabaseConfiguration = {
  pool?: DatabasePoolConfiguration;
  debug?: boolean;
  connection: OptionalConnectionConfiguration;
};
export type DatabaseConfiguration = RequiredDatabaseConfiguration & OptionalDatabaseConfiguration;

export const defaultDatabaseConfiguration: OptionalDatabaseConfiguration & {
  connection: {host: string; port: number};
} = {
  pool: undefined,
  debug: false,
  connection: {host: 'localhost', port: 5432, user: 'postgres'},
};

/**
 * Network config
 */
export type NetworkConfiguration = {
  erc20Address?: string;
  ethAssetHolderAddress?: string;
  erc20AssetHolderAddress?: string;
  rpcEndpoint?: string;
  chainNetworkID: string;
};
export const defaultNetworkConfiguration: NetworkConfiguration = {
  chainNetworkID: '0x00',
  erc20Address: undefined,
  ethAssetHolderAddress: undefined,
  erc20AssetHolderAddress: undefined,
};

/**
 * Logging and Metrics config
 */
export type LoggingConfiguration = {logLevel: pino.Level; logDestination: string};
export const defaultLoggingConfiguration: LoggingConfiguration = {
  logLevel: 'info',
  logDestination: 'console',
};

export type MetricConfiguration = {timingMetrics: boolean; metricsOutputFile?: string};
export const defaultMetricConfiguration = {timingMetrics: false};

/**
 * Server Wallet config
 */

/**
 * The required configuration to use the server wallet
 */
export type RequiredServerWalletConfig = {
  databaseConfiguration: RequiredDatabaseConfiguration;
};

/**
 * Additional configuration options for the server wallet
 */
export interface OptionalServerWalletConfig {
  databaseConfiguration: OptionalDatabaseConfiguration;
  stateChannelPrivateKey: string;
  ethereumPrivateKey: string;
  networkConfiguration: NetworkConfiguration;
  skipEvmValidation: boolean;
  workerThreadAmount: number;
  loggingConfiguration: LoggingConfiguration;
  metricConfiguration: MetricConfiguration;
}

export type ServerWalletConfig = RequiredServerWalletConfig & OptionalServerWalletConfig;
export type IncomingServerWalletConfig = RequiredServerWalletConfig &
  Partial<OptionalServerWalletConfig>;

/**
 * These are the default values that will be used by the server wallet
 * if not overidden in the provided config
 */
export const defaultConfig: OptionalServerWalletConfig = {
  databaseConfiguration: defaultDatabaseConfiguration,
  networkConfiguration: defaultNetworkConfiguration,
  loggingConfiguration: defaultLoggingConfiguration,
  metricConfiguration: defaultMetricConfiguration,
  // TODO: List addresses these keys correspond to
  stateChannelPrivateKey: '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b',
  ethereumPrivateKey: '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8',
  skipEvmValidation: false,
  workerThreadAmount: 10,
};

function readBoolean(envValue: string | undefined, defaultValue?: boolean): boolean {
  if (!envValue) return defaultValue || false;
  return envValue?.toLowerCase() === 'true';
}
function readInt(envValue: string | undefined, defaultValue?: number): number {
  if (!envValue) return defaultValue || 0;
  return Number.parseInt(envValue);
}
export const configFromEnvVars: ServerWalletConfig = {
  databaseConfiguration: {
    connection: process.env.SERVER_URL || {
      host: process.env.SERVER_HOST || defaultDatabaseConfiguration.connection.host,
      port: Number(process.env.SERVER_PORT) || defaultDatabaseConfiguration.connection.port,
      dbName: process.env.SERVER_DB_NAME || '',
      user: process.env.SERVER_DB_USER,
      password: process.env.SERVER_DB_PASSWORD,
    },
    debug: readBoolean(process.env.DEBUG_KNEX, defaultConfig.databaseConfiguration.debug),
  },
  metricConfiguration: {
    timingMetrics: readBoolean(
      process.env.TIMING_METRICS,
      defaultConfig.metricConfiguration.timingMetrics
    ),
    metricsOutputFile: process.env.METRICS_OUTPUT_FILE,
  },

  stateChannelPrivateKey:
    process.env.STATE_CHANNEL_PRIVATE_KEY || defaultConfig.stateChannelPrivateKey,
  ethereumPrivateKey: process.env.ETHEREUM_PRIVATE_KEY || defaultConfig.ethereumPrivateKey,
  networkConfiguration: {
    rpcEndpoint: process.env.RPC_ENDPOINT,
    chainNetworkID: process.env.CHAIN_NETWORK_ID || '0x00',
    ethAssetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
    erc20Address: process.env.ERC20_ADDRESS,
    erc20AssetHolderAddress: process.env.ERC20_ASSET_HOLDER_ADDRESS,
  },

  skipEvmValidation: (process.env.SKIP_EVM_VALIDATION || 'false').toLowerCase() === 'true',

  workerThreadAmount: readInt(
    process.env.AMOUNT_OF_WORKER_THREADS,
    defaultConfig.workerThreadAmount
  ),
  loggingConfiguration: {
    logLevel: (process.env.LOG_LEVEL as pino.Level) || defaultConfig.loggingConfiguration.logLevel,
    logDestination:
      process.env.LOG_DESTINATION || defaultConfig.loggingConfiguration.logDestination,
  },
};
type HasDatabaseConnectionConfigObject = {
  databaseConfiguration: {connection: {host: string; port: number; dbName: string}};
};
const DEFAULT_DB_NAME = 'server_wallet_test';
export const defaultTestConfig: ServerWalletConfig & HasDatabaseConnectionConfigObject = {
  ...defaultConfig,
  skipEvmValidation: readBoolean(process.env.SKIP_EVM_VALIDATION, true),
  workerThreadAmount: 0, // Disable threading for tests
  databaseConfiguration: {
    connection: {
      host: defaultDatabaseConfiguration.connection.host,
      port: defaultDatabaseConfiguration.connection.port,
      dbName: DEFAULT_DB_NAME,
      user: 'postgres',
    },
  },
};

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
