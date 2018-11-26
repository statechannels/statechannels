#! /usr/local/bin/node

'use strict';

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

if (!process.env.DEV_GANACHE_PORT) {
  process.env.DEV_GANACHE_PORT = 8545;
}

process.on('unhandledRejection', err => {
  throw err;
});

const { runJest } = require('../utils/runJest');
const { deployContracts } = require('../utils/deployContracts');
const { startGanache } = require('../utils/startGanache');

console.log(`Using port ${process.env.DEV_GANACHE_PORT} for Ganache.`);
startGanache().then(() => {
  deployContracts().then(() => {
    runJest().then(() => {
      // startGanache does not exit on its own, so we have to exit the process manually
      // once jest has finished running
      process.exit(0)
    });
  });
});