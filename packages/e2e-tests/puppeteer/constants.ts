import {getEnvBool, configureEnvVariables} from '@statechannels/devtools';

configureEnvVariables();
export const HEADLESS = getEnvBool('HEADLESS');
export const USE_DAPPETEER = getEnvBool('USE_DAPPETEER');
export const USES_VIRTUAL_FUNDING = process.env.FUNDING_STRATEGY === 'Virtual';
export const TARGET_NETWORK = process.env.TARGET_NETWORK || 'localhost';
export const USING_EXTERNAL_CHAIN =
  process.env.TARGET_NETWORK === 'ropsten' || process.env.TARGET_NETWORK === 'goerli';
export const JEST_TIMEOUT = USING_EXTERNAL_CHAIN ? 1_000_000 : 200_000;
export const APP_URL = process.env.WEB3TORRENT_URL
  ? process.env.WEB3TORRENT_URL
  : 'http://localhost:3000';
export const WALLET_URL = process.env.WALLET_URL ? process.env.WALLET_URL : 'http://localhost:3055';
export const TX_WAIT_TIMEOUT = USING_EXTERNAL_CHAIN ? 180_000 : 30000;
export const CHAIN_NETWORK_ID = process.env.CHAIN_NETWORK_ID;
export const RPC_ENDPOINT = process.env.RPC_ENDPOINT;
export const CLOSE_BROWSERS = process.env.CLOSE_BROWSERS ? getEnvBool('CLOSE_BROWSERS') : true;

export const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;

export const LOG_DESTINATION =
  !process.env.LOG_DESTINATION || process.env.LOG_DESTINATION === 'console'
    ? '/tmp'
    : process.env.LOG_DESTINATION;
