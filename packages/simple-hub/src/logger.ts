import pino from 'pino';

let _logger: pino.Logger;

export function logger() {
  if (!_logger) {
    _logger = pino();
  }
  return {
    debug: _logger.debug.bind(_logger),
    info: _logger.info.bind(_logger),
    error: _logger.error.bind(_logger),
    fatal: _logger.fatal.bind(_logger)
  };
}
