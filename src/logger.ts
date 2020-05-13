import pino from 'pino';

import {LOG_DESTINATION, ADD_LOGS, NODE_ENV} from './config';

// TODO: Is there a better way to determine if we're in a browser context?
const IS_BROWSER_CONTEXT = NODE_ENV !== 'test';

const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'xstate-wallet';

const destination =
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(LOG_DESTINATION) : undefined;

const serializeLogEvent = o => JSON.stringify({...o, name});

let browser: any = IS_BROWSER_CONTEXT
  ? {
      transmit: {
        send: (_, logEvent) =>
          // The simplest way to give users/developers easy access to the logs in a single place is to
          // make the application aware of all the pino logs via postMessage
          // Then, the application can package up all the logs into a single file
          window.parent.postMessage(
            {type: 'PINO_LOG', logEvent: {...JSON.parse(JSON.stringify(logEvent)), name}},
            '*'
          )
      }
    }
  : undefined;

if (browser && LOG_TO_FILE) {
  // TODO: Use the logBlob instead of writing to the browser logs
  browser = {...browser, write: o => console.log(serializeLogEvent(o))};
}

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const opts = {name, prettyPrint, browser};
export const logger = destination ? pino(opts, destination) : pino(opts);
