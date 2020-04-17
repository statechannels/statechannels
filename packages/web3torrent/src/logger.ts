import pino from 'pino';

const logger = pino();

// Temporarily export default with type similar to debug
export default prefix => (...x) => logger.info(prefix, ...x);
