let config = require('./jest.config');

module.exports = {
  ...config,
  bail: true,
  testMatch: ['<rootDir>/src/**/tests-with-chain/?(*.)test.ts?(x)'],
  testPathIgnorePatterns: [],
  globalSetup: '<rootDir>/jest/contract-test-setup.ts',
  globalTeardown: '<rootDir>/jest/contract-test-teardown.ts',
  setupFilesAfterEnv: []
};
