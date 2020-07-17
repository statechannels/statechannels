module.exports = {
  env: {
    node: true,
    es6: true
  },
  plugins: ['jest', 'import'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ]
};
