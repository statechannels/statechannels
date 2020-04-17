import pino from 'pino';
import {LOG_FILE} from './constants';

// TODO: Is there a better way to determine if we're in a browser context?
const isBrowserContext = process.env.NODE_ENV === 'test';
const destination = LOG_FILE && isBrowserContext ? pino.destination(LOG_FILE) : undefined;

const prettyPrint = LOG_FILE ? false : {translateTime: true};
const name = 'xstate-wallet';

// If we are in a browser, and we've specified a LOG_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)
const browser =
  LOG_FILE && isBrowserContext
    ? {write: o => console.log(JSON.stringify({...o, name}))}
    : undefined;

const opts = {name, prettyPrint, browser};
export const logger = destination ? pino(opts, destination) : pino(opts);
