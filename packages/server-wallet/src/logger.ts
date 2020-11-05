import pino from 'pino';

import {defaultConfig, ServerWalletConfig} from './config';
import {WALLET_VERSION} from './version';

export function createLogger(config: ServerWalletConfig): pino.Logger {
  const destination =
    config.logDestination && config.logDestination.toLocaleLowerCase() !== 'console'
      ? pino.destination(config.logDestination)
      : undefined;
  return (destination
    ? pino({level: config.logLevel}, destination)
    : pino({level: config.logLevel})
  ).child({
    dbName: config.postgresDBName,
    walletVersion: WALLET_VERSION,
  });
}

export const logger = createLogger(defaultConfig);
