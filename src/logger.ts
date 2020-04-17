import pino from 'pino';
import {LOG_FILE} from './constants';

const destination =
  LOG_FILE && process.env.NODE_ENV === 'test' ? pino.destination(LOG_FILE) : undefined;
const prettyPrint = destination ? false : {translateTime: true};
const name = 'xstate-wallet';

// If we are in a browser, pino.destination is not available.
// But, if we've specified a LOG_FILE, we assume that the log statements are meant to be stored as JSON objects
const browser = {
  write: o => console.log(JSON.stringify({...o, name}))
};

let logger: ReturnType<typeof pino>;
if (destination) logger = pino({name}, destination);
else if (LOG_FILE) logger = pino({name, browser});
else logger = pino({name, prettyPrint});

export {logger};
