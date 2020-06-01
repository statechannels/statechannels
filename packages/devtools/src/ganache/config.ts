import {configureEnvVariables} from '../config/env';

configureEnvVariables();

export const SHOW_VERBOSE_GANACHE_OUTPUT = process.env.SHOW_VERBOSE_GANACHE_OUTPUT === 'true';
export const SHOW_GANACHE_OUTPUT =
  SHOW_VERBOSE_GANACHE_OUTPUT || process.env.SHOW_GANACHE_OUTPUT == 'true';
export const LOG_DESTINATION: string = process.env.GANACHE_LOG_DESTINATION || 'console';

export const ADD_LOGS = SHOW_VERBOSE_GANACHE_OUTPUT || SHOW_GANACHE_OUTPUT;
export const LOG_LEVEL = ADD_LOGS ? process.env.LOG_LEVEL || 'info' : 'silent';

export const LOG_TO_CONSOLE = LOG_DESTINATION === 'console';
export const LOG_TO_FILE = ADD_LOGS && !LOG_TO_CONSOLE;
