const config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/__test__/with-peers/**/?(*.)test.ts'];
module.exports = config;
