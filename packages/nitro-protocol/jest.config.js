module.exports = {
  setupFilesAfterEnv: ['./jest.setup.js'],
  collectCoverageFrom: ['src/**/*.{js,jsx,ts,tsx}'],
  // TODO: It looks like jest is having some problems resolving to the jest-gas-reporter in node_modules
  // We need to figure out what the exact issue is and a way to work around it
  // reporters: ['default', '@statechannels/jest-gas-reporter'],

  reporters: ['default'],
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
