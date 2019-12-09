module.exports = {
  env: {
    node: true,
    es6: true
  },
  extends: ['../../.eslintrc.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
