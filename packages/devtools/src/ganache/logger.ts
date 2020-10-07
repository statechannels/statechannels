import pino from 'pino';

import {LOG_DESTINATION, ADD_LOGS, LOG_LEVEL} from './config';

const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;

const name = 'ganache-core';

const destination = LOG_TO_FILE ? pino.destination(LOG_DESTINATION) : undefined;

const prettyPrint = LOG_TO_CONSOLE ? {translateTime: true} : false;

const opts = {name, prettyPrint, level: LOG_LEVEL};
export const logger: pino.Logger = destination ? pino(opts, destination) : pino(opts);
