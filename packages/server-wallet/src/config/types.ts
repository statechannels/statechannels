import {Level} from 'pino';

import {ChainServiceArgs} from '../chain-service';

export type SyncConfiguration = {
  /** How often we check for stale or timed out objectives in milliseconds. */
  pollInterval: number;

  /**
   * The amount of time (in milliseconds) that we wait for until we consider an objective timed out.
   * When an objective is timed out we give up trying to complete it and return an error.
   */
  timeOutThreshold: number;

  /**
   * The amount of time (in milliseconds) that we wait for until we consider an objective "stale"
   * If an objective is stale we attempt to sync the objectives with the other participants.
   */
  staleThreshold: number;
};

/**
 * Either a connection string or a config object with the dbName specified
 */
export type DatabaseConnectionConfiguration = RequiredConnectionConfiguration &
  Partial<OptionalConnectionConfiguration>;

/**
 * Either a database connection string or a config object specifying the database name
 */
export type RequiredConnectionConfiguration =
  | {database: string; host: string; user: string; password?: string}
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
 * Chain service configuration options
 */
export type ChainServiceConfiguration = {
  attachChainService: boolean;
  // We don't want to accept a complex object like the logger in the configuration object
} & Partial<Exclude<ChainServiceArgs, 'logger'>>;

/**
 * The minimum required configuration to use the wallet.
 */
export type RequiredWalletConfig = {
  databaseConfiguration: RequiredDatabaseConfiguration;
  networkConfiguration: NetworkConfiguration;
};

/**
 * Additional configuration options for the wallet that are not required.
 */
export interface OptionalWalletConfig {
  databaseConfiguration: OptionalDatabaseConfiguration;
  workerThreadAmount: number;
  skipEvmValidation: boolean;
  chainServiceConfiguration: ChainServiceConfiguration;
  loggingConfiguration: LoggingConfiguration;
  metricsConfiguration: MetricsConfiguration;
  syncConfiguration: SyncConfiguration;
  /**
   * This is the private key used to sign channel updates.
   * If not provided one will be generated.
   */
  privateKey?: string;
}

/**
 * This is a fully filled out config. All Required and Optional fields are defined.
 */
export type WalletConfig = RequiredWalletConfig & OptionalWalletConfig;

/**
 * This is the config accepted by the engine create method.
 * It is the required config properties plus additional optional properties
 */
export type IncomingWalletConfig = RequiredWalletConfig & Partial<OptionalWalletConfig>;

/**
 * Various network configuration options
 */
export type NetworkConfiguration = {
  chainNetworkID: number;
};

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
