var config = require('./jest.config');
config.testMatch = ['<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)'];
config.reporters = ['default', '@statechannels/jest-gas-reporter'];
module.exports = config;
