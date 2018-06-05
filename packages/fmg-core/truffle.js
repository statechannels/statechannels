require('babel-register');
require("babel-polyfill");

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  mocha: {
    // reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
    }
  }
};
