'use strict';

//TODO: This will be obsolete when we move to jest tests
var path = require('path');
const {
  exec
} = require('child_process');

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

if (!process.env.DEV_GANACHE_PORT) {
  process.env.DEV_GANACHE_PORT = 8545;
}

process.on('unhandledRejection', err => {
  throw err;
});

let {
  startGanache,
  deployContracts,
  runJest
} = require('magmo-devtools');

console.log(`Using port ${process.env.DEV_GANACHE_PORT} for Ganache.`);
startGanache().then(() => {

  console.log('deploying contracts');
  deployContracts().then(() => {
    console.log('running jest');
    runJest()
  });
});