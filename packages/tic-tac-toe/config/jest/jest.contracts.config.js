var config = require('./jest.config');
config.testMatch = ['<rootDir>/contracts/tests/?(*.)test.ts?(x)'];
config.reporters = ['default', '@statechannels/jest-gas-reporter'];
config.globalSetup = '<rootDir>/jest/contract-test-setup.ts';
config.globalTeardown = '<rootDir>/jest/contract-test-teardown.ts';
module.exports = config;
