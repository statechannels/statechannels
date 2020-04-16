import pino from 'pino';

export const logger = pino({
  name: 'xstate-wallet',
  prettyPrint: {
    translateTime: true,
    ignore: 'pid,hostname'
  }
});
