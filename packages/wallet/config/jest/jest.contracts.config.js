let config = require("./jest.config");

module.exports = {
  ...config,
  testMatch: ["<rootDir>/src/**/contract-tests/?(*.)test.ts?(x)"],
};
