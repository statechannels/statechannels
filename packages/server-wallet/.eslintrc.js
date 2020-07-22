module.exports = {
  env: {
    // server-wallet runs in Node.JS environments
    node: true,
    // We expect to be able to use Promise and Set
    es6: true,
  },
  plugins: ['jest', 'import'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  rules: {
    // It's annoying having to deal with these jest rules
    'jest/no-disabled-tests': 'off',
    'jest/expect-expect': 'off',
    // We use snake case for some PostgreSQL / Objection client library key names
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-unused-vars': [1, {argsIgnorePattern: '^_'}],
  },
};
