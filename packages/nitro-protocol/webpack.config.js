const path = require('path');

const config = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.(ts|json)$/,
        use: 'ts-loader',
        include: [
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'test'),
          path.resolve(__dirname, 'build/contracts/*.json'),
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
    mainFields: ['unpkg', 'browser', 'module', 'main'],
  },
  target: 'web',
  mode: 'production',
  output: {
    filename: 'nitro-protocol.min.js',
    libraryTarget: 'window',
    path: path.resolve(__dirname, 'dist'),
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
};

module.exports = [config];
