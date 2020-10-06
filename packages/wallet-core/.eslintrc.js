module.exports = {
  env: {
    node: true,
    es6: true
  },
  plugins: ['jest'],
  extends: ['../../.eslintrc.js', 'plugin:jest/recommended', 'plugin:jest/style'],
  rules: {
    'no-process-env': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'no-restricted-imports': ['error', {patterns: ['**/lib', '**/src']}],
    'arrow-body-style': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    // TODO remove this ^^^
    '@typescript-eslint/ban-types': 'off'
    // TODO remove this ^^^
  },
  overrides: [
    {
      // process.env allowed in tests
      files: ['*.test.ts'],
      rules: {'no-process-env': 'off'}
    },
    {
      // process.env allowed in src/config.js
      files: ['src/config.ts'],
      rules: {'no-process-env': 'off'}
    }
  ]
};
