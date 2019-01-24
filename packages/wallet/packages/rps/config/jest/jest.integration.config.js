var config = require('./jest.config')
config.testMatch = ["<rootDir>/src/**/integration-tests/?(*.)test.ts?(x)"];
module.exports = config;