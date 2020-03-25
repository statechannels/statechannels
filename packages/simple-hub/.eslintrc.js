// From the tslint.json we used previously
module.exports = {
  env: {
    node: true,
    es6: true
  },
  plugins: ['jest'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript'
  ],
  rules: {
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'arrow-body-style': 'error'
  }
};
