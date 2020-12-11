const {configureEnvVariables} = require('@statechannels/devtools');
configureEnvVariables();
const {resolve} = require('path');
const root = resolve(__dirname, '../../');

module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },
  rootDir: root,
  collectCoverageFrom: ['**/*.{js,jsx,ts,tsx}'],
  reporters: ['default'],
  testMatch: ['<rootDir>/test/src/**/?(*.)test.ts?(x)'],
  testEnvironment: 'node',
  testURL: 'http://localhost',
  preset: 'ts-jest',
};
