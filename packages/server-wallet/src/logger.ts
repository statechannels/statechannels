import pino from 'pino';

let _logger: pino.Logger;

export function logger() {
  if (!_logger) {
    _logger = pino();
  }
  return _logger;
}
