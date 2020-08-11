/**
 * This should be the only file that reads from the environment.
 */

interface ServerWalletConfig {
  nodeEnv: 'test' | 'development' | 'production';
  postgresDatabaseUrl?: string;
  postgresHost?: string;
  postgresPort?: string;
  postgresDBName?: string;
  postgresDBUser?: string;
  serverSignerPrivateKey: string;
  serverPrivateKey: string;
  rpcEndpoint?: string;
  chainNetworkID?: string;
  ethAssetHolderAddress?: string;
  debugKnex?: string;
}

// TODO: Nest configuration options inside keys like db, server, wallet, debug, etc
const config: ServerWalletConfig = {
  nodeEnv: process.env.NODE_ENV as 'test' | 'development' | 'production',
  postgresDatabaseUrl: process.env.SERVER_URL,
  postgresHost: process.env.SERVER_HOST,
  postgresPort: process.env.SERVER_PORT,
  postgresDBName: process.env.SERVER_DB_NAME,
  postgresDBUser: process.env.SERVER_DB_USER,
  serverSignerPrivateKey:
    process.env.SERVER_SIGNER_PRIVATE_KEY ||
    '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8',
  serverPrivateKey:
    process.env.SERVER_PRIVATE_KEY ||
    '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b',
  rpcEndpoint: process.env.RPC_ENDPOINT,
  chainNetworkID: process.env.CHAIN_NETWORK_ID,
  ethAssetHolderAddress: process.env.ETH_ASSET_HOLDER_ADDRESS,
  debugKnex: process.env.DEBUG_KNEX,
};

if (['test', 'development', 'production'].indexOf(config.nodeEnv) === -1) {
  throw new Error(`Invalid NODE_ENV: ${config.nodeEnv}`);
}

export default config;
