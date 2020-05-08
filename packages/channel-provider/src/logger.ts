import pino from 'pino';

// eslint-disable-next-line no-undef
const LOG_TO_CONSOLE = process.env.LOG_DESTINATION === 'console';
// eslint-disable-next-line no-undef
const LOG_TO_FILE = process.env.LOG_DESTINATION && !LOG_TO_CONSOLE;

const name = 'channel-provider';

// If we are in a browser, but we want to LOG_TO_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)
const browser = LOG_TO_FILE
  ? {write: (o: any) => console.log(JSON.stringify({...o, name}))}
  : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const opts = {name, prettyPrint, browser};
export const logger = pino(opts);
