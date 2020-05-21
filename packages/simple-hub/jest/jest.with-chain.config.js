let config = require('./jest.config');

module.exports = {
  ...config,
  bail: true,
  testMatch: ['<rootDir>/src/**/__tests-with-chain__/?(*.)test.ts?(x)'],
  globalSetup: '<rootDir>/jest/test-setup.with-chain.ts',
  globalTeardown: '<rootDir>/jest/test-teardown.with-chain.ts'
};
