module.exports = {
  ...require('../../.prettierrc.js'),
  trailingComma: 'es5',
  printWidth: 100,
  overrides: [
    {
      files: '*.sol',
      options: {
        tabWidth: 4,
      },
    },
  ],
};
