const {resolve} = require('path');
const root = resolve(__dirname, '../');

module.exports = {
  rootDir: root,
  testMatch: ['<rootDir>/**/__test__/**/?(*.)test.ts'],
  testEnvironment: 'jsdom',
  transform: {'^.+\\.ts$': 'ts-jest'},
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|ts)$'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {'ts-jest': {tsconfig: './tsconfig.json'}},
  globalSetup: '<rootDir>/jest/chain-setup.ts',
  globalTeardown: '<rootDir>/jest/test-teardown.ts'
};
