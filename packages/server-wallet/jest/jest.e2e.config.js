const config = require('./jest.config');
config.testMatch = ['<rootDir>/e2e-test/?(*.)test.ts?(x)'];
module.exports = config;
