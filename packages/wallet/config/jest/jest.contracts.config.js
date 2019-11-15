let config = require("./jest.config");

module.exports = {
  ...config,
  globalSetup: "<rootDir>/config/jest/global-setup-jest-contracts.ts",
  testEnvironment: "<rootDir>/config/jest/node-test-environment.js",
  testMatch: ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"],
};
