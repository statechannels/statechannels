const {resolve} = require("path");
const root = resolve(__dirname, "../../");

// Load environment variables from .env
require("../env");

module.exports = {
  rootDir: root,

  testMatch: ["<rootDir>/puppeteer/**/?(*.)test.ts?(x)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  }
};
