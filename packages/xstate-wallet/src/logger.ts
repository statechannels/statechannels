import pino from 'pino';

import {LOG_DESTINATION, ADD_LOGS, JEST_WORKER_ID, LOG_LEVEL} from './config';
import _ from 'lodash';

const IS_BROWSER_CONTEXT = JEST_WORKER_ID === undefined;

const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'xstate-wallet';

const destination =
  LOG_TO_FILE && !IS_BROWSER_CONTEXT ? pino.destination(LOG_DESTINATION) : undefined;

const postMessageAndCallConsoleFn = (consoleFn: {
  (message?: any, ...optionalParams: any[]): void;
}) => (o: any) => {
  const withName = JSON.stringify({...o, name});

  // The simplest way to give users/developers easy access to the logs in a single place is to
  // make the application aware of all the pino logs via postMessage
  // Then, the application can package up all the logs into a single file
  window.parent.postMessage({type: 'PINO_LOG', logEvent: JSON.parse(withName)}, '*');
  if (LOG_TO_FILE) consoleFn(withName);
  else consoleFn(o.msg, _.omit(o, 'msg'));
};

const browser: any = IS_BROWSER_CONTEXT
  ? {
      write: {
        error: postMessageAndCallConsoleFn(console.error),
        warn: postMessageAndCallConsoleFn(console.warn),
        info: postMessageAndCallConsoleFn(console.info),
        debug: postMessageAndCallConsoleFn(console.debug),
        trace: postMessageAndCallConsoleFn(console.trace)
      }
    }
  : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const level = window.localStorage.LOG_LEVEL ?? LOG_LEVEL;
const opts = {name, prettyPrint, browser, level};
const logger = destination ? pino(opts, destination) : pino(opts);
logger.on('level-change', (lvl, val, prevLvl, prevVal) => {
  console.log('wallet: %s (%d) was changed to %s (%d)', lvl, val, prevLvl, prevVal);
});

window.addEventListener('message', event => {
  const key = 'LOG_LEVEL';

  if (event.data.type === 'SET_LOG_LEVEL') {
    const {level} = event.data;
    console.log(`wallet: level CHANGED from ${logger.level} to ${level}`);
    window.localStorage.setItem(key, level);
    logger.level = level;
  } else if (event.data.type === 'CLEAR_LOG_LEVEL') {
    console.log(`wallet: level CLEARED from ${logger.level} to ${LOG_LEVEL}`);
    window.localStorage.removeItem(key);
    logger.level = LOG_LEVEL;
  }
});

export {logger};
