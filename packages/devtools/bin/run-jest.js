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
    runJest
} = require('../utils/runJest');

runJest().then((output) => {
    if (output.results.numFailedTestSuites > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
});