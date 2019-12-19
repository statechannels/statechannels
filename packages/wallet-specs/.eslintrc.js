const baseConfig = require('../../.eslintrc.js');

module.exports = {
  ...baseConfig,
  env: {
    node: true,
    es6: true
  },
  plugins: [...baseConfig.plugins, 'jest'],
  extends: [
    ...baseConfig.extends,
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  rules: {
    ...baseConfig.rules,

    'no-unused-vars': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
  }
};
