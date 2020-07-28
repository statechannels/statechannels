module.exports = {
  env: {
    // server-wallet runs in Node.JS environments
    node: true,
    // We expect to be able to use Promise and Set
    es6: true,
  },
  plugins: ['jest', 'import', 'unicorn'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  rules: {
    // It's annoying having to deal with these jest rules
    'jest/no-disabled-tests': 'off',
    'jest/expect-expect': 'off',
    'no-process-env': 'error',
    'unicorn/filename-case': [
      'error',
      // Enforce kebab casing for file names except for generated seed/migration files
      {case: 'kebabCase', ignore: [/^\d_.*_seeds\.ts$/, /^\d{14}_.*\.ts$/]},
    ],
  },
  overrides: [
    {
      // process.env allowed in some files
      files: ['src/config.ts', 'scripts/*', 'e2e-test/jest/*'],
      rules: {'no-process-env': 'off'},
    },
    {
      files: ['**/*.ts'],
      extends: ['plugin:import/typescript'],
      rules: {
        // We use snake case for some PostgreSQL / Objection client library key names
        '@typescript-eslint/camelcase': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-unused-vars': [1, {argsIgnorePattern: '^_'}],
      },
    },
  ],
};
