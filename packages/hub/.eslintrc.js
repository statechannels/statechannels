// From the tslint.json we used previously
const leftoverTsLintRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-use-before-define': 'off',
  '@typescript-eslint/no-unused-vars': 'off'
};

// Jest violations
const jestViolations = {
  'jest/no-disabled-tests': 'off',
  'jest/expect-expect': 'off'
};

const otherViolations = {
  '@typescript-eslint/camelcase': 'off'
};

module.exports = {
  env: {
    node: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'prettier', 'jest'],
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
    // Prettier violations should result in linting errors
    'prettier/prettier': 'warn',

    ...leftoverTsLintRules,
    ...jestViolations,
    ...otherViolations
  }
};
