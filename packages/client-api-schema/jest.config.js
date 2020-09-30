module.exports = {
  globals: {
    'ts-jest': {
      packageJson: 'package.json',
    },
  },
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};
