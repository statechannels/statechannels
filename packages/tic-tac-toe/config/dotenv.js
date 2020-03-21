/* eslint-env node */

'use strict';

const path = require('path');

module.exports = function(env) {
  const DOT_ENV_PATH = path.join(
    path.dirname(__dirname),
    `.env${env === 'production' ? '.production' : ''}`
  );
  return {
    clientAllowedKeys: [
      'TARGET_NETWORK',
      'FIREBASE_PROJECT',
      'WALLET_URL',
      'TTT_CONTRACT_ADDRESS',
      'CHAIN_NETWORK_ID',
      'USE_GANACHE_DEPLOYMENT_CACHE'
    ],
    failOnMissingKey: true,
    path: DOT_ENV_PATH
  };
};
