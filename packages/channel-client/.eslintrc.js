module.exports = {
  env: {
    browser: true,
    es6: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'prettier', 'jest', 'eslint-plugin-tsdoc'],
  extends: [
    '../../.eslintrc.js',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:prettier/recommended'
  ],
  rules: {
    'prettier/prettier': ['warn'],
    '@typescript-eslint/no-explicit-any': 'off',
    'tsdoc/syntax': 'warn'
  }
};
