module.exports = {
  globals: {
    'ts-jest': {
      packageJson: 'package.json',
      tsConfig: './tsconfig.json',
    },
  },
  preset: 'ts-jest',
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { url: 'http://anything.com', resources: 'usable' },
  globalSetup: './jest.setup.ts',
};
