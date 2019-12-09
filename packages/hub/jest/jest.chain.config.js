const config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/__chain-test__/?(*.)test.ts?(x)'];
config.globalSetup = '<rootDir>/jest/test-setup.ts';
config.globalTeardown = '<rootDir>/jest/test-teardown.ts';
module.exports = config;
