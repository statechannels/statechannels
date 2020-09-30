const { resolve } = require('path');
const root = resolve(__dirname, '../../');
module.exports = {
  globalSetup: '<rootDir>/jest/test-setup.ts',
  rootDir: root,
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/tests-with-chain'],
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  globals: {
    GIT_VERSION: 'jest-GIT_VERSION',
    GIT_COMMIT_HASH: 'jest-GIT_COMMIT_HASH',
    GIT_BRANCH: 'jest-GIT_BRANCH',
    globals: {
      'ts-jest': {
        packageJson: 'package.json',
      },
    },
  },
};
