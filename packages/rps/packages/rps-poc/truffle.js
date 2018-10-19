var HDWalletProvider = require("truffle-hdwallet-provider");
require('dotenv').config()

// We only want this loaded in a test environment 
// so we can load and parse this file from the app
if (process.env.NODE_ENV === 'test') {
  require('ts-node/register'); 
}

require('babel-register'); // To handle es6 syntax in the tests

module.exports = {
  networks: {
    development: {
      host: process.env.DEV_GANACHE_HOST,
      port: process.env.DEV_GANACHE_PORT,
      network_id: '*', // match any network
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
      enabled: process.env.ENABLE_SOLC_OPTIMIZER === 'TRUE',
      runs: 200,
    },
  },
};