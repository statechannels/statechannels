import pino from 'pino';

const _logger = pino();

export const log = {
  debug: _logger.debug.bind(_logger),
  info: _logger.info.bind(_logger),
  error: _logger.error.bind(_logger),
  fatal: _logger.fatal.bind(_logger)
};
