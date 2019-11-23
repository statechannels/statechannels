let config = require("./jest.config");

module.exports = {
  ...config,
  testMatch: ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"],
  setupFilesAfterEnv: [] // We don't want to run a test setup that mocks out contract related utils
};
