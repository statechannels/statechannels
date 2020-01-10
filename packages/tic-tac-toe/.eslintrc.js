const generalRules = {
  'no-undef': 'off' // Shouldn't need this, tsc takes care of it
};

// Jest violations
const jestViolations = {
  'jest/valid-describe': 'off',
  'jest/no-focused-tests': 'off',
  'jest/no-export': 'off',
  'jest/no-identical-title': 'off',
  'jest/no-try-expect': 'off',
  'jest/no-disabled-tests': 'off',

  // For these two, the linter doesn't know we're using a helper function
  'jest/expect-expect': 'off',
  'jest/no-standalone-expect': 'off'
};

module.exports = {
  parser: 'babel-eslint',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      legacyDecorators: true
    }
  },
  env: {
    browser: true,
    es6: true
  },
  plugins: ['jest'],
  extends: [
    'eslint:recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:prettier/recommended'
  ],
  rules: {
    ...generalRules,
    ...jestViolations,
  }
};
