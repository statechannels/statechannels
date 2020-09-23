const config = require('./jest.e2e.config');
config.testMatch = ['<rootDir>/lib/e2e-test/stress.test.js'];
module.exports = config;
