#! /usr/local/bin/node
'use strict';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

const {
  deployContracts,
  startGanache,
  runJest
} = require('../utils/helperFunctions');
process.env.DEV_GANACHE_PORT = 7447;
process.env.DEV_GANACHE_HOST = '127.0.0.1';
startGanache().then(deployContracts).then(runJest);
