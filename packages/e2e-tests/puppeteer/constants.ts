import {getEnvBool, configureEnvVariables} from '@statechannels/devtools';
configureEnvVariables();
export const HEADLESS = getEnvBool('HEADLESS');
export const USE_DAPPETEER = getEnvBool('USE_DAPPETEER');
export const USES_VIRTUAL_FUNDING = process.env.REACT_APP_FUNDING_STRATEGY === 'Virtual';
export const JEST_TIMEOUT = HEADLESS ? 200_000 : 1_000_000;
export const TARGET_NETWORK = process.env.TARGET_NETWORK || 'localhost';
export const APP_URL = process.env.WEB3TORRENT_URL
  ? process.env.WEB3TORRENT_URL
  : 'http://localhost:3000';
export const WALLET_URL = process.env.REACT_APP_WALLET_URL
  ? process.env.REACT_APP_WALLET_URL
  : 'http://localhost:3055';
export const TX_WAIT_TIMEOUT = process.env.TARGET_NETWORK === 'ropsten' ? 90000 : 30000;
export const CLOSE_BROWSERS = process.env.CLOSE_BROWSERS ? getEnvBool('CLOSE_BROWSERS') : true;

export const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;
