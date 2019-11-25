let config = require("./jest.config");

module.exports = {
  ...config,
  testMatch: ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"],
  setupFilesAfterEnv: ["<rootDir>/src/setupContractTests.ts"]
};
