module.exports = {
  env: {
    browser: true,
    es6: true
  },
  plugins: ['jest', 'eslint-plugin-tsdoc'],
  extends: ['../../.eslintrc.js', 'plugin:jest/recommended', 'plugin:jest/style'],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'tsdoc/syntax': 'warn'
  }
};
