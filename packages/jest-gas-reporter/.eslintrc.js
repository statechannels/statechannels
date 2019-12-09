module.exports = {
  ...require('../../.eslintrc.js'),
  env: {
    node: true, // Jest Gas Reporter is meant to be used in a `jest` process
    es6: true
  }
};
