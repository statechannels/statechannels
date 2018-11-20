require('dotenv').config()

module.exports = {
  networks: {
    development: {
      host: process.env.DEV_GANACHE_HOST,
      port: process.env.DEV_GANACHE_PORT,
      network_id: '*', // match any network
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
  compilers: {
    solc: {
      version: process.env.SOLC_VERSION, // either a string like '0.5.0' or 'native', if you want to use your locally built solc compiler (eg. nightly)
    }
  }
};
