/* eslint-disable no-process-env */
import {
  LoggingConfiguration,
  NetworkConfiguration,
  OptionalDatabaseConfiguration,
  OptionalServerWalletConfig,
  ServerWalletConfig,
} from './types';

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

export const defaultNetworkConfiguration: NetworkConfiguration = {
  chainNetworkID: '0x00',
  erc20Address: undefined,
  ethAssetHolderAddress: undefined,
  erc20AssetHolderAddress: undefined,
};

/**
 * Logging and Metrics config
 */
export const defaultLoggingConfiguration: LoggingConfiguration = {
  logLevel: 'info',
  logDestination: 'console',
};

export const defaultMetricConfiguration = {timingMetrics: false};

/**
 * Server Wallet config
 */

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

export const DEFAULT_DB_NAME = 'server_wallet_test';
export const DEFAULT_DB_USER = 'postgres';
type HasDatabaseConnectionConfigObject = {
  databaseConfiguration: {connection: {host: string; port: number; dbName: string}};
};
export const defaultTestConfig: ServerWalletConfig & HasDatabaseConnectionConfigObject = {
  ...defaultConfig,
  skipEvmValidation: true,
  workerThreadAmount: 0, // Disable threading for tests
  databaseConfiguration: {
    connection: {
      host: defaultDatabaseConfiguration.connection.host,
      port: defaultDatabaseConfiguration.connection.port,
      dbName: DEFAULT_DB_NAME,
      user: DEFAULT_DB_USER,
    },
  },
};
