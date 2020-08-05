const config = require('./jest.e2e.config');
config.testMatch = ['<rootDir>/e2e-test/stress.test.ts?(x)'];
module.exports = config;
