const config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/__test-with-peers__/**/?(*.)test.ts'];
module.exports = config;
