const { resolve } = require('path');
const root = resolve(__dirname, '../../');

module.exports = {
  rootDir: root,
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  setupFiles: ['./config/env.js'],
  setupFilesAfterEnv: ['./src/config/knexSetupTeardown.ts'],
  testMatch: ['<rootDir>/**/__test__/**/?(*.)(spec|test).ts'],
  testEnvironment: 'node',
  testURL: 'http://localhost',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  transformIgnorePatterns: ['[/\\\\]node_modules[/\\\\].+\\.(js|jsx|mjs|ts|tsx)$'],
  moduleFileExtensions: [
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'web.js',
    'js',
    'web.jsx',
    'jsx',
    'json',
    'node',
    'mjs',
  ],
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json',
    },
  },
};
