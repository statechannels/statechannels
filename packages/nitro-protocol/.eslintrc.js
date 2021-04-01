// From the tslint.json we used previously
const leftoverTsLintRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-use-before-define': 'off',
  '@typescript-eslint/ban-ts-ignore': 'off',
};

module.exports = {
  env: {
    // We need both `node` and `browser` because `nitro-protocol` is used in both environments;
    // so for example, `process` and `window` are both valid global variables.
    node: true,
    browser: true,
    es6: true,
  },
  plugins: ['jest'],
  extends: ['../../.eslintrc.js', 'plugin:jest/recommended', 'plugin:jest/style'],
  rules: {
    ...leftoverTsLintRules,
  },
};
