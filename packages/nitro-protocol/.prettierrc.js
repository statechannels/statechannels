module.exports = {
  ...require('../../.prettierrc.js'),
  "trailingComma": "es5",
  "overrides": [
    {
      "files": "*.sol",
      "options": {
        "tabWidth": 4
      }
    }
  ]
};