module.exports = {
  env: {
    browser: true,
    es6: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "tsconfig.json",
    ecmaVersion: 2018,
    sourceType: "module"
  },
  plugins: [
    /* "@typescript-eslint", "@typescript-eslint/tslint", "prettier" */
  ],
  extends: [
    // "plugin:@typescript-eslint/recommended",
    // "eslint:recommended",
    // "plugin:import/errors",
    // "plugin:import/warnings",
    // "plugin:import/typescript",
    // "prettier/@typescript-eslint",
    // "prettier"
  ],
  rules: {
    // "prettier/prettier": "error"
  }
  //   overrides: [
  //     {
  //       files: ["test/**/*.ts"],
  //       env: {
  //         node: true
  //       },
  //       globals: {
  //         Promise: "readonly",
  //         expect: "readonly",
  //         it: "readonly",
  //         describe: "readonly",
  //         beforeAll: "readonly",
  //         beforeEach: "readonly"
  //       }
  //     },
  //     {
  //       files: ["ganache/**/*.ts"],
  //       env: {
  //         node: true
  //       }
  //     }
  //   ]
};
