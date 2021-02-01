const config = require('./jest.config');
config.testMatch = ['<rootDir>/e2e-test/*.test.ts?(x)'];
// We don't want to use the default knex setup as we're using two DBs for the e2e test
config.setupFilesAfterEnv = [];
config.globalSetup = '<rootDir>/jest/chain-setup.ts';
config.globalTeardown = '<rootDir>/jest/test-teardown.ts';
module.exports = config;
