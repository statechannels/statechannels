import pino from 'pino';
import _ from 'lodash';

// eslint-disable-next-line no-undef
const LOG_TO_CONSOLE = process.env.LOG_DESTINATION === 'console';
// eslint-disable-next-line no-undef
const LOG_TO_FILE = process.env.LOG_DESTINATION && !LOG_TO_CONSOLE;
// eslint-disable-next-line no-undef
const IS_BROWSER_CONTEXT = process.env.JEST_WORKER_ID === undefined;

const name = 'channel-provider';

const postMessageAndCallToConsoleFn = (consoleFn: {
  (message?: any, ...optionalParams: any[]): void;
}) => (o: any) => {
  const withName = JSON.stringify({...o, name});

  // The simplest way to give users/developers easy access to the logs in a single place is to
  // make the application aware of all the pino logs via postMessage
  // Then, the application can package up all the logs into a single file
  window.postMessage({type: 'PINO_LOG', logEvent: JSON.parse(withName)}, '*');
  if (LOG_TO_FILE) consoleFn(withName);
  else consoleFn(o.msg, _.omit(o, 'msg'));
};

const browser: any = IS_BROWSER_CONTEXT
  ? {
      write: {
        error: postMessageAndCallToConsoleFn(console.error),
        warn: postMessageAndCallToConsoleFn(console.warn),
        info: postMessageAndCallToConsoleFn(console.info),
        debug: postMessageAndCallToConsoleFn(console.debug),
        trace: postMessageAndCallToConsoleFn(console.trace)
      }
    }
  : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;
// When logging, we default to 'info', as most logs happen at this level.
// Some very large classes are serialized at the 'trace' level
// We probably don't want these logged to the console, but strictly enabling this
// in the browser might sometimes be helpful
// eslint-disable-next-line no-undef
export const LOG_LEVEL = LOG_TO_FILE || LOG_TO_CONSOLE ? process.env.LOG_LEVEL || 'info' : 'silent';

const opts = {name, prettyPrint, browser, level: LOG_LEVEL};
export const logger = pino(opts);
