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

const importRules = {
  // Could not get this rule to work properly
  'import/no-unresolved': 'off',
  'import/no-duplicates': 'off',
  // NOTE: There is some error with eslint-plugin-import treating redux-saga/effects wrongly
  // https://github.com/benmosher/eslint-plugin-import/issues/793#issuecomment-314088164
  'import/named': 'off'
};

module.exports = {
  parser: '@typescript-eslint/parser',
  env: {
    browser: true,
    es6: true
  },
  plugins: ['@typescript-eslint', 'jest', 'prettier'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:prettier/recommended'
  ],
  rules: {
    ...generalRules,
    ...importRules,
    ...jestViolations
  },
  overrides: [
    {
      files: ['**/*.js'],
      parser: 'babel-eslint',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
          legacyDecorators: true
        }
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      },
      env: {
        node: true
      }
    }
  ]
};
