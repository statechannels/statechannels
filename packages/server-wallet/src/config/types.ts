import {Level} from 'pino';

/**
 * Either a connection string or a config object with the dbName specified
 */
export type DatabaseConnectionConfiguration = RequiredConnectionConfiguration &
  Partial<OptionalConnectionConfiguration>;

/**
 * Either a database connection string or a config object specifying the database name
 */
export type RequiredConnectionConfiguration =
  | {dbName: string; host: string; user: string; password?: string}
  | string;

/**
 * Optional database config properties.
 */
export type OptionalConnectionConfiguration = {port: number} | string;

/**
 * Database pool size options
 */
export type DatabasePoolConfiguration = {max?: number; min?: number};

/**
 * The minimum required database configuration that must be provided
 */
export type RequiredDatabaseConfiguration = {connection: RequiredConnectionConfiguration};
export type OptionalDatabaseConfiguration = {
  pool?: DatabasePoolConfiguration;
  debug?: boolean;
  connection: OptionalConnectionConfiguration;
};

/**
 * The fully defined database configuration
 */
export type DatabaseConfiguration = RequiredDatabaseConfiguration & OptionalDatabaseConfiguration;

/**
 * Logging configuration options
 */
export type LoggingConfiguration = {logLevel: Level; logDestination: string};

/**
 * Metrics configuration options
 */
export type MetricsConfiguration = {timingMetrics: boolean; metricsOutputFile?: string};

/**
 * The minimum required configuration to use the server wallet.
 */
export type RequiredServerWalletConfig = {
  databaseConfiguration: RequiredDatabaseConfiguration;
  workerThreadAmount: number;
  networkConfiguration: NetworkConfiguration;
  ethereumPrivateKey: string;
};

/**
 * Additional configuration options for the server wallet that are not required.
 */
export interface OptionalServerWalletConfig {
  databaseConfiguration: OptionalDatabaseConfiguration;
  skipEvmValidation: boolean;
  loggingConfiguration: LoggingConfiguration;
  metricsConfiguration: MetricsConfiguration;
}

/**
 * This is a fully filled out config. All Required and Optional fields are defined.
 */
export type ServerWalletConfig = RequiredServerWalletConfig & OptionalServerWalletConfig;

/**
 * This is the config accepted by the wallet create method.
 * It is the required config properties plus additional optional properties
 */
export type IncomingServerWalletConfig = RequiredServerWalletConfig &
  Partial<OptionalServerWalletConfig>;

/**
 * Various network configuration options
 */
export type NetworkConfiguration = {
  erc20Address: string;
  ethAssetHolderAddress: string;
  erc20AssetHolderAddress: string;
  rpcEndpoint?: string;
  chainNetworkID: string;
};
