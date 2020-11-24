import {Level} from 'pino';

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

export type LoggingConfiguration = {logLevel: Level; logDestination: string};
export type MetricConfiguration = {timingMetrics: boolean; metricsOutputFile?: string};
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

export type NetworkConfiguration = {
  erc20Address?: string;
  ethAssetHolderAddress?: string;
  erc20AssetHolderAddress?: string;
  rpcEndpoint?: string;
  chainNetworkID: string;
};
