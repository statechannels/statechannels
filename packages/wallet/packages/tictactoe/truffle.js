var HDWalletProvider = require("truffle-hdwallet-provider");
require('dotenv').config()

// We only want this loaded in a test environment
// so we can load and parse this file from the app

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
    },
    main: {
      provider: () => new HDWalletProvider(process.env.ETH_ACCOUNT_MNENOMIC, "https://infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 1,
      gas: process.env.DEFAULT_GAS,
      gasPrice: process.env.DEFAULT_GAS_PRICE,
    },
    ropsten: {
      provider: () => new HDWalletProvider(process.env.ETH_ACCOUNT_MNENOMIC, "https://ropsten.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 3,
      gas: process.env.DEFAULT_GAS,
      gasPrice: process.env.DEFAULT_GAS_PRICE,
    },
    rinkeby: {
      provider: () => new HDWalletProvider(process.env.ETH_ACCOUNT_MNENOMIC, "https://rinkeby.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 4,
      gas: process.env.DEFAULT_GAS,
      gasPrice: process.env.DEFAULT_GAS_PRICE,
    },
    kovan: {
      provider: () => new HDWalletProvider(process.env.ETH_ACCOUNT_MNENOMIC, "https://kovan.infura.io/v3/" + process.env.INFURA_API_KEY),
      network_id: 42,
      gas: process.env.DEFAULT_GAS,
      gasPrice: process.env.DEFAULT_GAS_PRICE,
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};