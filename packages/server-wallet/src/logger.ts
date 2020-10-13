import pino from 'pino';

import {processEnvConfig, ServerWalletConfig} from './config';

export function createLogger(config: ServerWalletConfig): pino.Logger {
  // eslint-disable-next-line no-process-env
  const destination =
    config.logDestination && config.logDestination.toLocaleLowerCase() !== 'console'
      ? pino.destination(config.logDestination)
      : undefined;
  return destination ? pino({level: config.logLevel}, destination) : pino({level: config.logLevel});
}

export const logger = createLogger(processEnvConfig);
