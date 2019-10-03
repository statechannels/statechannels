let config = require('./jest.config')

module.exports = {
  ...config,
  globalSetup : "<rootDir>/config/jest/global-setup-jest-contracts.js",
  globalTeardown : "<rootDir>/config/jest/global-teardown-jest-contracts.js",
  testMatch : ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"],
}
