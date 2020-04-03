const {configureEnvVariables} = require('@statechannels/devtools');
configureEnvVariables();

const {resolve} = require('path');
// eslint-disable-next-line no-undef
const root = resolve(__dirname, '../../');
module.exports = {
  rootDir: root,
  testMatch: ['<rootDir>/src/**/*.test.ts*'],
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  collectCoverageFrom: [
    './src/**/*.ts*',
    '!./src/**/index.ts*',
    '!./src/routes.ts*',
    '!./src/library/testing/*.ts*',
    '!./src/library/time-based-leeching/*.ts*',
    '!./src/utils/copy-to-clipboard.ts',
    '!./src/utils/test-utils.ts',
    '!./src/components/form/form-input/**',
    '!./src/utils/useInterval.ts',
    '!./src/**/react-app-env.d.ts',
    '!./src/**/types.ts',
    '!./src/**/constants.ts',
    '!./test/utils.ts'
  ],
  globalSetup: '<rootDir>/src/library/testing/setup.js',
  globalTeardown: '<rootDir>/src/library/testing/teardown.js',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  }
};
