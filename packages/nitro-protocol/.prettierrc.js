module.exports = {
  ...require('../../.prettierrc.js'),
  "bracketSpacing": false,
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "overrides": [
    {
      "files": "*.sol",
      "options": {
        "tabWidth": 4
      }
    }
  ]
};