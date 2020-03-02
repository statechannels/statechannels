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
      files: ['app/**/*.js'],
      parser: 'babel-eslint',
      parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
          legacyDecorators: true
        }
      },
      plugins: ['ember'],
      extends: ['eslint:recommended', 'plugin:ember/recommended'],
      env: {
        browser: true
      },
      rules: {
        'ember/no-jquery': 'error'
      }
    },
    // ember node files
    {
      files: [
        '.eslintrc.js',
        '.template-lintrc.js',
        'ember-cli-build.js',
        'testem.js',
        'blueprints/*/index.js',
        'config/**/*.js',
        'lib/*/index.js',
        'server/**/*.js'
      ],
      parserOptions: {
        sourceType: 'script'
      },
      env: {
        browser: false,
        node: true
      },
      plugins: ['node'],
      rules: Object.assign({}, require('eslint-plugin-node').configs.recommended.rules, {
        // add your custom rules and overrides for node files here

        // this can be removed once the following is fixed
        // https://github.com/mysticatea/eslint-plugin-node/issues/77
        'node/no-unpublished-require': 'off'
      })
    },
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
