'use strict';

//TODO: Add more functionality
var ganache = require('ganache-cli');
const { execFile, exec } = require('child_process');

process.env.BABEL_ENV = 'test';
process.env.NODE_ENV = 'test';
process.env.PUBLIC_URL = '';

if (!process.env.DEV_GANACHE_PORT) {
  process.env.DEV_GANACHE_PORT = 5732;
}
console.log(`Using port ${process.env.DEV_GANACHE_PORT} for Ganache.`);

try {
  var ganache = require('ganache-cli');
  var server = ganache.server({ port: process.env.DEV_GANACHE_PORT });
  server.listen(process.env.DEV_GANACHE_PORT, function(err, blockchain) {
    if (err) {
      return console.log(err);
    }
  });

  exec('truffle test --network ganache', (err, stdout, stderr) => {
    // Errors seem to be piped to stdout so we just output that always
    console.log(stdout);
    if (stderr) {
       console.log(stderr);
       process.exit(1);
    }
    if (err) {
       console.log(err);
       process.exit(1);
    }
  });

  server.close();
} catch (err) {
  if (err && err.message) {
    console.log(err.message);
  }
  process.exit(1);
}
