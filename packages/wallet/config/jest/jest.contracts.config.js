let config = require("./jest.config");

module.exports = {
  ...config,
  globalSetup: "<rootDir>/config/jest/global-setup-jest-contracts.js",
  testMatch: ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"]
};
