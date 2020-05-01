import pino from 'pino';

// TODO: Is there a better way to determine if we're in a browser context?
// eslint-disable-next-line no-undef
const IS_BROWSER_CONTEXT = process.env.NODE_ENV !== 'test';

// eslint-disable-next-line no-undef
const LOG_TO_CONSOLE = process.env.LOG_DESTINATION === 'console';
const LOG_TO_FILE = !LOG_TO_CONSOLE;

const name = 'channel-provider';

const destination =
  // eslint-disable-next-line no-undef
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(process.env.LOG_DESTINATION) : undefined;

// If we are in a browser, but we want to LOG_TO_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)
const browser =
  LOG_TO_FILE && IS_BROWSER_CONTEXT
    ? {write: (o: any) => console.log(JSON.stringify({...o, name}))}
    : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const opts = {name, prettyPrint, browser};
export const logger = destination ? pino(opts, destination) : pino(opts);
