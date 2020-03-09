/**
 * Type declarations for
 *    import config from './config/environment'
 *
 * For now these need to be managed by the developer
 * since different ember addons can materialize new entries.
 */
declare const config: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environment: any;
  modulePrefix: string;
  podModulePrefix: string;
  locationType: string;
  rootURL: string;
  TARGET_NETWORK: string;
  FIREBASE_PROJECT: string;
  FIREBASE_API_KEY: string;
  FIREBASE_PREFIX: string;
  WALLET_URL: string;
  TTT_CONTRACT_ADDRESS: string;
};

export default config;
