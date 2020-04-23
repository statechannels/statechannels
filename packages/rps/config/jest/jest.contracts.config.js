let config = require('./jest.config');

module.exports = {
  ...config,
  testMatch: ['<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)'],
  reporters: ['default', '@statechannels/jest-gas-reporter'],
  globalSetup: '<rootDir>/jest/contract-test-setup.ts',
  globalTeardown: '<rootDir>/jest/contract-test-teardown.ts',
};
