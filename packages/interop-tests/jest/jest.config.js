const {resolve} = require('path');
const root = resolve(__dirname, '../');

module.exports = {
  rootDir: root,
  testMatch: ['<rootDir>/**/__test__/**/?(*.)test.ts'],
  testEnvironment: 'node',
  transform: {'^.+\\.ts$': 'ts-jest'},
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|ts)$'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  moduleNameMapper: {
    '.(scss|svg)$': 'identity-obj-proxy'
  },
  globals: {
    'ts-jest': {tsconfig: './tsconfig.json'},
    window: {localStorage: {}, addEventListener: (_p1, p2) => ({})}
  },
  globalSetup: '<rootDir>/jest/chain-setup.ts',
  globalTeardown: '<rootDir>/jest/test-teardown.ts'
};
