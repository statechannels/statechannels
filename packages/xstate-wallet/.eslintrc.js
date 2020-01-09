const baseConfig = require("../../.eslintrc.js");

const generalRules = {
  "no-var": "off",
  "no-async-promise-executor": "off",
  "no-case-declarations": "off",
  "no-extra-boolean-cast": "off",
  "no-undef": "off" // Shouldn't need this, tsc takes care of it
};

// From the tslint.json we used previously
const leftoverTsLintRules = {
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/explicit-function-return-type": "off",
  "@typescript-eslint/no-use-before-define": "off",
  "@typescript-eslint/ban-ts-ignore": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
  // TODO: Get rid of this, there are just a small number of cases
  "@typescript-eslint/no-unused-vars": "off"
};

// Jest violations
const jestViolations = {
  "jest/valid-describe": "off",
  "jest/no-focused-tests": "off",
  "jest/no-export": "off",
  "jest/no-identical-title": "off",
  "jest/no-try-expect": "off",
  "jest/no-disabled-tests": "off",

  // For these two, the linter doesn't know we're using a helper function
  "jest/expect-expect": "off",
  "jest/no-standalone-expect": "off"
};

const importRules = {
  // Could not get this rule to work properly
  "import/no-unresolved": "off",
  "import/no-duplicates": "off",
  // NOTE: There is some error with eslint-plugin-import treating redux-saga/effects wrongly
  // https://github.com/benmosher/eslint-plugin-import/issues/793#issuecomment-314088164
  "import/named": "off"
};

const reactRules = {
  "react/no-unescaped-entities": "off"
};

module.exports = {
  ...baseConfig,
  env: {
    browser: true,
    es6: true
  },
  plugins: [...baseConfig.plugins, "jest", "react"],
  settings: {
    react: {
      version: "detect"
    }
  },
  extends: [
    ...baseConfig.extends,
    "plugin:jest/recommended",
    "plugin:jest/style",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:react/recommended"
  ],
  rules: {
    ...baseConfig.rules,

    // @typescript-eslint/no-unused-vars overrides this
    "no-unused-vars": "off",

    ...generalRules,
    ...leftoverTsLintRules,
    ...importRules,
    ...jestViolations,
    ...reactRules
  }
};
