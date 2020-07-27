const config = require('../../jest/jest.config');

config.testMatch = ['<rootDir>/e2e-test/?(*.)test.ts?(x)'];
config.globalSetup = '<rootDir>/e2e-test/jest/e2e-setup.ts';
config.globalTeardown = '<rootDir>/e2e-test/jest/e2e-teardown.ts';

module.exports = config;
