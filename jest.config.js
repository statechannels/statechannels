module.exports = {
  reporters: ['default', 'jest-junit'],
  testMatch: ['<rootDir>/tests/?(*.)+(test).js'],
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js'
};
