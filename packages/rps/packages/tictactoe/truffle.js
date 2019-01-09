// We only want this loaded in a test environment
// so we can load and parse this file from the app
require('dotenv').config()

if (process.env.NODE_ENV === 'test') {
  require('ts-node/register');
}

require("babel-register"); // To handle es6 syntax in the tests

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545, // Using ganache as development network
      network_id: "*",
      gas: 6721975,
      gasPrice: 20000000,
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};