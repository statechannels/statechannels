const baseConfig = require('../../.eslintrc.js');

module.exports = {
  ...baseConfig,
  env: {
    browser: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  plugins: [...baseConfig.plugins, '@typescript-eslint', 'prettier', 'jest', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': ['warn'],
    '@typescript-eslint/no-explicit-any': 'off'
  }
};
