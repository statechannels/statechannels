module.exports = {
  rootDir: __dirname,

  testMatch: ['<rootDir>/puppeteer/**/?(*.)test.ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  globalSetup: '<rootDir>/jest.setup.ts',
  verbose: true
};
