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

const emberRules = {
  'ember/no-jquery': 'error'
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
  plugins: ['jest', 'ember'],
  extends: [
    'eslint:recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:ember/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    ...generalRules,
    ...jestViolations,
    ...emberRules
  },
  overrides: [
    // node files
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
    }
  ]
};
