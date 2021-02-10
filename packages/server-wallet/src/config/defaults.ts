import _ from 'lodash';

import {
  DeepPartial,
  LoggingConfiguration,
  NetworkConfiguration,
  OptionalDatabaseConfiguration,
  OptionalServerWalletConfig,
  ServerWalletConfig,
} from './types';

export const defaultDatabaseConfiguration: OptionalDatabaseConfiguration & {
  connection: {host: string; port: number; user: string};
} = {
  pool: undefined,
  debug: false,
  connection: {host: 'localhost', port: 5432, user: 'postgres'},
};

/**
 * Network config
 */

/**
 * Logging and Metrics config
 */
export const defaultLoggingConfiguration: LoggingConfiguration = {
  logLevel: 'info',
  logDestination: 'console',
};

export const defaultMetricsConfiguration = {timingMetrics: false};

export const defaultChainServiceConfiguration = {
  attachChainService: false,
};

/**
 * Server Wallet config
 */

/**
 * These are the default values that will be used by the server wallet
 * if not overidden in the provided config
 */
export const defaultConfig: OptionalServerWalletConfig = {
  databaseConfiguration: defaultDatabaseConfiguration,
  loggingConfiguration: defaultLoggingConfiguration,
  metricsConfiguration: defaultMetricsConfiguration,
  chainServiceConfiguration: defaultChainServiceConfiguration,
  skipEvmValidation: false,
  workerThreadAmount: 0,
};

export const DEFAULT_DB_NAME = 'server_wallet_test';
export const DEFAULT_DB_USER = 'postgres';
type HasDatabaseConnectionConfigObject = {
  databaseConfiguration: {connection: {host: string; port: number; database: string}};
};
export const defaultTestNetworkConfiguration: NetworkConfiguration = {
  chainNetworkID: 0,
};

export const defaultTestConfig = (
  partialConfig: DeepPartial<ServerWalletConfig & HasDatabaseConnectionConfigObject> = {}
): ServerWalletConfig & HasDatabaseConnectionConfigObject => {
  const fullDefaultConfig = {
    ...defaultConfig,
    networkConfiguration: defaultTestNetworkConfiguration,
    skipEvmValidation: true,
    workerThreadAmount: 0, // Disable threading for tests
    databaseConfiguration: {
      connection: {
        host: defaultDatabaseConfiguration.connection.host,
        port: defaultDatabaseConfiguration.connection.port,
        database: DEFAULT_DB_NAME,
        user: DEFAULT_DB_USER,
      },
      // DO NOT CHANGE DEFAULTS.
      // `max: 1` is required to detect deadlocks caused by application code that attempts
      // to acquire a new connection before the connection serving the transaction is released
      pool: {min: 0, max: 1},
    },
  };
  return _.merge({}, fullDefaultConfig, partialConfig);
};
