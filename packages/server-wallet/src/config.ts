/**
 * This should be the only file that reads from the environment.
 */

import Knex from 'knex';

type DBConfig = {
  client: 'postgres';
  connection: string | Knex.PgConnectionConfig;
  pool: Knex.Config['pool'];
};

type ServerWalletConfig = {
  nodeEnv?: 'test' | 'development' | 'production';
  serverSignerPrivateKey: string;
  serverPrivateKey: string;
  rpcEndpoint?: string;
  chainNetworkID: string;
  ethAssetHolderAddress?: string;
  debugKnex?: string;
  skipEvmValidation: boolean;
  timingMetrics: boolean;
  metricsOutputFile?: string;
  dbConfig: DBConfig;
};

const requiredString = (key: string): string => {
  const value = optionalString(key);
  if (typeof value === 'string') return value;
  else throw new Error(`Expected process.env.${key} to be a string`);
};

// const requiredNumber = (key: string): number => {
//   const value = optionalNumber(key);
//   if (typeof value === 'number') return value;
//   else throw new Error(`Expected process.env.${key} to be a number`);
// };

const optionalString = (key: string): string | undefined => process.env[key];
const optionalNumber = (key: string): number | undefined => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) ? value : undefined;
};

// TODO: Nest configuration options inside keys like server, wallet, debug, etc
const config: ServerWalletConfig = {
  nodeEnv: process.env.NODE_ENV as 'test' | 'development' | 'production',
  serverSignerPrivateKey:
    process.env.SERVER_SIGNER_PRIVATE_KEY ||
    '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8',
  serverPrivateKey:
    process.env.SERVER_PRIVATE_KEY ||
    '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b',
  rpcEndpoint: process.env.RPC_ENDPOINT,
  chainNetworkID: process.env.CHAIN_NETWORK_ID || '0x00',
  ethAssetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  debugKnex: process.env.DEBUG_KNEX,
  skipEvmValidation: (process.env.SKIP_EVM_VALIDATION || 'false').toLowerCase() === 'true',
  timingMetrics: process.env.TIMING_METRICS === 'ON',
  metricsOutputFile: process.env.METRICS_OUTPUT_FILE,
  dbConfig: {
    client: 'postgres',
    connection: optionalString('SERVER_URL') ?? {
      host: optionalString('SERVER_HOST'),
      port: optionalNumber('SERVER_PORT'),
      database: requiredString('SERVER_DB_NAME'),
      user: requiredString('SERVER_DB_USER'),
      password: optionalString('SERVER_DB_PASSWORD') ?? '',
    },
    pool: {
      min: optionalNumber('CONNECTION_POOL_MIN'),
      max: optionalNumber('CONNECTION_POOL_MAX'),
    },
  },
};

export default config;
