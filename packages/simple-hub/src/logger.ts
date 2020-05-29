import pino from 'pino';
import {LOG_DESTINATION, IS_PRODUCTION} from './constants';
const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = LOG_DESTINATION && !LOG_TO_CONSOLE;

const name = 'simple-hub';

const destination = LOG_TO_FILE ? pino.destination(LOG_DESTINATION) : undefined;
const prettyPrint = LOG_TO_CONSOLE && !IS_PRODUCTION ? {translateTime: true, color: true} : false;

const opts = {name, prettyPrint};
export const log = destination ? pino(opts, destination) : pino(opts);
