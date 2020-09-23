const config = require('./jest.config');
config.testMatch = ['<rootDir>/lib/e2e-test/e2e.test.js'];
module.exports = config;
