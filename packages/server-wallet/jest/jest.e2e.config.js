const config = require('./jest.config');
config.testMatch = ['<rootDir>/e2e-test/e2e.test.ts?(x)'];
module.exports = config;
