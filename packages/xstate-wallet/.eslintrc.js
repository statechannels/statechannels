const generalRules = {
  'no-process-env': 'error',
  'no-case-declarations': 'off',
  'no-undef': 'off' // Shouldn't need this, tsc takes care of it,
};

// From the tslint.json we used previously
const leftoverTsLintRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/no-use-before-define': 'off'
};

module.exports = {
  env: {
    browser: true,
    es6: true
  },
  plugins: ['jest', 'react'],
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    '../../.eslintrc.js',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:react/recommended'
  ],
  rules: {
    // @typescript-eslint/no-unused-vars overrides this
    'no-unused-vars': 'off',

    ...generalRules,
    ...leftoverTsLintRules,

    'no-restricted-imports': ['error', {patterns: ['**/lib/**', '**/src/**']}],
    'arrow-body-style': 'error',
    'import/order': [
      'error',
      {
        groups: [
          ['external', 'builtin'],
          ['internal', 'index', 'sibling', 'parent']
        ]
      }
    ]
  },

  overrides: [
    // process.env allowed in tests
    {
      files: ['*.test.ts'],
      rules: {
        'no-process-env': 'off'
      }
    },
    // process.env allowed in src/config.js
    {
      files: ['src/config.ts'],
      rules: {
        'no-process-env': 'off'
      }
    }
  ]
};
