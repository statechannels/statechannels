import pino from 'pino';
import {LOG_FILE} from './constants';

const destination = LOG_FILE && pino.destination(LOG_FILE);
const prettyPrint = destination ? false : {translateTime: true, ignore: 'pid,hostname'};
const name = 'xstate-wallet';

let logger: ReturnType<typeof pino>;
if (destination) logger = pino({name}, destination);
else logger = pino({name, prettyPrint});

export {logger};
