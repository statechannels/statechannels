const {resolve} = require('path');
const root = resolve(__dirname, '../../');
module.exports = {
  rootDir: root,
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/src/tests-with-chain'],
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
