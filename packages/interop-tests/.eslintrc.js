module.exports = {
  env: {
    // server-wallet runs in Node.JS environments
    node: true,
    // We expect to be able to use Promise and Set
    es6: true
  },
  plugins: ['jest', 'import', 'unicorn'],
  extends: ['../../.eslintrc.js', 'plugin:jest/recommended', 'plugin:jest/style'],
  rules: {
    // It's annoying having to deal with these jest rules
    'jest/no-disabled-tests': 'off',
    'jest/expect-expect': 'off',
    'no-process-env': 'error'
  },
  overrides: [
    {
      // process.env allowed in some files
      files: ['scripts/*'],
      rules: {'no-process-env': 'off'}
    },
    {
      files: ['**/*.ts'],
      extends: ['plugin:import/typescript'],
      rules: {
        '@typescript-eslint/no-unused-vars': [1, {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}]
      }
    }
  ]
};
