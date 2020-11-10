const {resolve} = require('path');

const rootDir = resolve(__dirname, '../');

module.exports = {
  rootDir,
  collectCoverageFrom: ['src/**/*.{js,ts}'],
  globals: {'ts-jest': {tsConfig: './tsconfig.json'}},
  globalSetup: '<rootDir>/jest/chain-setup.ts',
  globalTeardown: '<rootDir>/jest/test-teardown.ts',
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__chain-test__/?(*.)test.ts?(x)'],
  testURL: 'http://localhost',
  transform: {'^.+\\.ts$': 'ts-jest'},
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|ts)$'],
};
