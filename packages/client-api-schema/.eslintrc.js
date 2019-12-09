const baseConfig = require('../../.eslintrc.js');

module.exports = {
  ...baseConfig,
  env: {
    node: true,
    es6: true
  }
};
