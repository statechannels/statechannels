/**
 * This should be the only file that reads from the environment.
 */

import {Config} from 'knex';
import {knexSnakeCaseMappers} from 'objection';
import * as pino from 'pino';

export interface ServerWalletConfig {
  nodeEnv?: 'test' | 'development' | 'production';
  postgresDatabaseUrl?: string;
  postgresHost?: string;
  postgresPort?: string;
  postgresDBName?: string;
  postgresDBUser?: string;
  postgresDBPassword?: string;
  serverSignerPrivateKey: string;
  serverPrivateKey: string;
  rpcEndpoint?: string;
  chainNetworkID: string;
  erc20Address?: string;
  ethAssetHolderAddress?: string;
  erc20AssetHolderAddress?: string;
  debugKnex?: string;
  skipEvmValidation: boolean;
  timingMetrics: boolean;
  metricsOutputFile?: string;
  workerThreadAmount: number;
  logLevel: pino.Level;
  logDestination?: string; // console or undefined will log to console
  postgresPoolSize?: {max: number; min: number};
}

// TODO: Nest configuration options inside keys like db, server, wallet, debug, etc
export const defaultConfig: ServerWalletConfig = {
  nodeEnv: process.env.NODE_ENV as 'test' | 'development' | 'production',
  postgresDatabaseUrl: process.env.SERVER_URL,
  postgresHost: process.env.SERVER_HOST,
  postgresPort: process.env.SERVER_PORT,
  postgresDBName: process.env.SERVER_DB_NAME,
  postgresDBUser: process.env.SERVER_DB_USER,
  postgresDBPassword: process.env.SERVER_DB_PASSWORD,
  serverSignerPrivateKey:
    process.env.SERVER_SIGNER_PRIVATE_KEY ||
    '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8',
  serverPrivateKey:
    process.env.SERVER_PRIVATE_KEY ||
    '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b',
  rpcEndpoint: process.env.RPC_ENDPOINT,
  chainNetworkID: process.env.CHAIN_NETWORK_ID || '0x00',
  ethAssetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  erc20Address: process.env.ERC20_ADDRESS,
  erc20AssetHolderAddress: process.env.ERC20_ASSET_HOLDER_ADDRESS,
  debugKnex: process.env.DEBUG_KNEX,
  skipEvmValidation: (process.env.SKIP_EVM_VALIDATION || 'false').toLowerCase() === 'true',
  timingMetrics: process.env.TIMING_METRICS === 'ON',
  metricsOutputFile: process.env.METRICS_OUTPUT_FILE,
  workerThreadAmount: Number.parseInt(process.env.AMOUNT_OF_WORKER_THREADS || '0', 10),
  logLevel: (process.env.LOG_LEVEL as pino.Level) || 'info',
  logDestination: process.env.LOG_DESTINATION || 'console',
};

export const defaultTestConfig = {
  ...defaultConfig,
  skipEvmValidation: (process.env.SKIP_EVM_VALIDATION || 'true').toLowerCase() === 'true',
  postgresPoolSize: {max: 1, min: 0},
};

export function extractDBConfigFromServerWalletConfig(
  serverWalletConfig: ServerWalletConfig
): Config {
  return {
    client: 'postgres',
    connection: serverWalletConfig.postgresDatabaseUrl || {
      host: serverWalletConfig.postgresHost,
      port: Number(serverWalletConfig.postgresPort),
      database: serverWalletConfig.postgresDBName,
      user: serverWalletConfig.postgresDBUser,
      password: serverWalletConfig.postgresDBPassword,
    },
    ...knexSnakeCaseMappers(),
    pool: serverWalletConfig.postgresPoolSize || {},
  };
}
