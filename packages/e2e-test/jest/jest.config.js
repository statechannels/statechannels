const {resolve} = require('path');
const root = resolve(__dirname, '../');

module.exports = {
  rootDir: root,
  collectCoverageFrom: ['src/**/*.{js,ts}'],
  testMatch: ['<rootDir>/**/__test__/**/?(*.)(spec|test).ts'],
  testEnvironment: 'jsdom',
  testURL: 'http://localhost',
  transform: {'^.+\\.ts$': 'ts-jest'},
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|ts)$'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  globals: {'ts-jest': {tsconfig: './tsconfig.json'}}
};
