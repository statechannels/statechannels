const baseConfig = require('../../.eslintrc.js');

// From the tslint.json we used previously
const leftoverTsLintRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-use-before-define': 'off'
};

const jestViolations = {
  'jest/no-disabled-tests': 'off',
  'jest/expect-expect': 'off'
};

const otherViolations = {
  '@typescript-eslint/camelcase': 'off'
};

module.exports = {
  ...baseConfig,
  env: {
    node: true,
    es6: true
  },
  plugins: [...baseConfig.plugins, 'jest'],
  extends: [
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  rules: {
    ...leftoverTsLintRules,
    ...jestViolations,
    ...otherViolations
  }
};
