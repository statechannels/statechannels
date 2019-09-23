require('dotenv').config();

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
      enabled: true, // Always want optimization enabled to prevent StackTooDeep error
      runs: 200,
    },
  },
  compilers: {
    solc: {
      version: '0.5.11',
    },
  },
};
