/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');

const config = {
  entry: './lib/src/index.js',
  module: {},
  target: 'web',
  mode: 'production',
  output: {
    filename: 'nitro-protocol.min.js',
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname, 'dist'),
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
};

module.exports = [config];
