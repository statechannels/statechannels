module.exports = {
  env: {
    node: true,
    es6: true,
  },
  plugins: ['jest'],
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'no-debugger': 'off',
    'no-useless-catch': 'off',
    'no-empty-pattern': 'off',
    'import/first': 2,
    "import/order": ["error", {
      "groups": ["builtin", "external", "internal",  "parent", "sibling", "index"],
      "newlines-between": "always-and-inside-groups"
    }],
    'no-restricted-imports': ['error', { patterns: ['**/lib/**', '**/src/**'] }],
  },
};
