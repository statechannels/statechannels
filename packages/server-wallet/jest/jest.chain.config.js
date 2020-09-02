const config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/__chain-test__/?(*.)test.ts?(x)'];
config.globalSetup = '<rootDir>/jest/chain-setup.ts';
config.globalTeardown = '<rootDir>/jest/chain-teardown.ts';
module.exports = config;
