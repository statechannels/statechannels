const {resolve} = require("path");
const root = resolve(__dirname, "../../");

module.exports = {
  rootDir: root,

  testMatch: ["<rootDir>/puppeteer/**/?(*.)test.ts?(x)"],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  }
};
