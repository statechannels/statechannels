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
  plugins: ['eslint-plugin-tsdoc'],
  rules: {
    '@typescript-eslint/ban-types': 'off',
    // TODO remove this ^^
    'tsdoc/syntax': 'warn'
  },
  env: {
    node: true,
    es6: true
  }
};
