module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  reporters: ['default', '@statechannels/jest-gas-reporter'],
  testMatch: ['<rootDir>/test/**/?(*.)(spec|test).(t)s?(x)'],
  testPathIgnorePatterns: ['/node_modules/'],
  testEnvironment: 'node',
  testURL: 'http://localhost',
  transformIgnorePatterns: ['[/\\\\](node_modules|scripts)[/\\\\].+\\.(js|jsx|mjs)$'],
  globals: {
    'ts-jest': {
      tsConfig: './tsconfig.json',
    },
  },
  preset: 'ts-jest',
};
