import pino from 'pino';

import {getDatabaseConnectionConfig, ServerWalletConfig} from './config';
import {WALLET_VERSION} from './version';

export function createLogger(config: ServerWalletConfig): pino.Logger {
  const destination =
    config.loggingConfiguration.logDestination &&
    config.loggingConfiguration.logDestination.toLocaleLowerCase() !== 'console'
      ? pino.destination(config.loggingConfiguration.logDestination)
      : undefined;

  return (destination
    ? pino({level: config.loggingConfiguration.logLevel}, destination)
    : pino({level: config.loggingConfiguration.logLevel})
  ).child({
    dbName: getDatabaseConnectionConfig(config).database,
    walletVersion: WALLET_VERSION,
  });
}
