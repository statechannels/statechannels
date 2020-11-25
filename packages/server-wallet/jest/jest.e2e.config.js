const config = require('./jest.config');
config.testMatch = ['<rootDir>/e2e-test/e2e.test.ts?(x)'];
// We don't want to use the default knex setup as we're using two DBs for the e2e test
config.setupFilesAfterEnv =[];
module.exports = config;
