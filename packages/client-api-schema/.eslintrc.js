module.exports = {
  plugins: ['jest'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style'
  ],
  env: {
    node: true,
    es6: true
  }
};
