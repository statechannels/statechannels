import pino from 'pino';
import {LOG_DESTINATION, ADD_LOGS, LOG_LEVEL} from './constants';

// TODO: Is there a better way to determine if we're in a browser context?
const IS_BROWSER_CONTEXT = process.env.NODE_ENV !== 'test';
const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'web3torrent';

const destination =
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(LOG_DESTINATION) : undefined;

// If we are in a browser, but we want to LOG_TO_FILE, we assume that the
// log statements are meant to be stored as JSON objects
// So, we log serialized objects, appending the name (which the pino browser-api appears to remove?)

// Since WebTorrentPaidStreamingClient contains circular references, we use
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value#Examples
const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return;
      seen.add(value);
    }

    return value;
  };
};

const browser =
  LOG_TO_FILE && IS_BROWSER_CONTEXT
    ? {write: o => console.log(JSON.stringify({...o, name}, getCircularReplacer()))}
    : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const level = LOG_LEVEL;
const opts = {name, prettyPrint, browser, level};

export const logger = destination ? pino(opts, destination) : pino(opts);
