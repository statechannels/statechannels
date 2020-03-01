module.exports = {
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  testEnvironment: 'jsdom',
  preset: 'ts-jest',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
