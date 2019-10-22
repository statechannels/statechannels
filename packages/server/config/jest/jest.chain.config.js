var config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/__chain-test__/?(*.)test.ts?(x)'];
module.exports = config;
