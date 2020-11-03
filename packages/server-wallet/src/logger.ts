import pino from 'pino';

import {defaultConfig, ServerWalletConfig} from './config';
import {WALLET_VERSION} from './version';

export function createLogger(config: ServerWalletConfig): pino.Logger {
  // eslint-disable-next-line no-process-env
  const destination =
    config.logDestination && config.logDestination.toLocaleLowerCase() !== 'console'
      ? pino.destination(config.logDestination)
      : undefined;
  return destination
    ? pino({level: config.logLevel}, destination).child({
        dbName: config.postgresDBName,
        walletVersion: WALLET_VERSION,
      })
    : pino({level: config.logLevel}).child({
        dbName: config.postgresDBName,
        walletVersion: WALLET_VERSION,
      });
}

export const logger = createLogger(defaultConfig);
