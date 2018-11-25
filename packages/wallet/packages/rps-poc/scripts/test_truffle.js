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
  process.env.DEV_GANACHE_PORT = 5732;
}

process.on('unhandledRejection', err => {
  throw err;
});


console.log(`Using port ${process.env.DEV_GANACHE_PORT} for Ganache.`);
require('magmo-devtools').startGanache().then(() => {
  const trufflePath = path.resolve(__dirname, '../node_modules/.bin/truffle');
  const truffleCommand = `${trufflePath} test --network ganache`;
  exec(truffleCommand, (err, stdout, stderr) => {
    console.log(stdout);
    if (stderr) {
      console.log(stderr);
      process.exit(1);
    }
    if (err) {
      console.log(err);
      process.exit(1);
    }
    process.exit(0);
  });

});