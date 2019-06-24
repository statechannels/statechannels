#! /usr/local/bin/node

"use strict";

process.env.BABEL_ENV = "test";
process.env.NODE_ENV = "test";
process.env.PUBLIC_URL = "";

if (!process.env.GANACHE_PORT) {
  process.env.GANACHE_PORT = 8545;
}

process.on("unhandledRejection", err => {
  throw err;
});

const { runJest } = require("../utils/runJest");
const { deployContracts } = require("../utils/deployContracts");
const { startGanache } = require("../utils/startGanache");
let argv = require("yargs").argv;
console.log(`Using port ${process.env.GANACHE_PORT} for Ganache.`);
startGanache(argv).then(() => {
  deployContracts().then(() => {
    runJest().then(output => {
      // startGanache does not exit on its own, so we have to exit the process manually
      // once jest has finished running
      if (output.results.numFailedTestSuites > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    });
  });
});
