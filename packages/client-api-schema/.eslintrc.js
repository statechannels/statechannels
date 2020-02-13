const baseConfig = require('../../.eslintrc.js');

module.exports = {
  ...baseConfig,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style'
  ],
  env: {
    node: true,
    es6: true
  }
};
