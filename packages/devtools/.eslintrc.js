module.exports = {
  env: {
    node: true,
    es6: true
  },
  extends: ['../../.eslintrc.js'],
  plugins: ['import'],
  rules: {
    'import/order': [
      1,
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always'
      }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off'
  }
};
