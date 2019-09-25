var config = require('./jest.config')
config.testMatch = ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"];
module.exports = config;