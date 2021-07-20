var config = require('./jest.config');
config.testMatch = ['<rootDir>/test/contracts/**/*.test.ts'];
config.reporters = ['default'];
config.globalSetup = '<rootDir>/jest/contract-test-setup.ts';
config.globalTeardown = '<rootDir>/jest/contract-test-teardown.ts';
config.testTimeout = 30_000;
module.exports = config;
