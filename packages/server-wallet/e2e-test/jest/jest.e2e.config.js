const config = require('../jest/jest.config');

config.testMatch = ['<rootDir>/e2e-test/?(*.)test.ts?(x)'];
config.testEnvironment = '<rootDir>/e2e-test/e2e-environment.js';
config.globalSetup = '<rootDir>/e2e-test/e2e-setup.ts';
config.globalTeardown = '<rootDir>/e2e-test/e2e-teardown.ts';

module.exports = config;
