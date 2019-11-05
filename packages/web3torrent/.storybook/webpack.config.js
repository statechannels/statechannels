const path = require('path');

module.exports = async ({config, mode}) => {
  config.node = {fs: 'empty'};
  config.resolve.alias['../../../clients/web3torrent-client'] = path.resolve(
    __dirname,
    './web3torrent-client.mock.js'
  );
  return config;
};
