const path = require('path');

const typescript = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: ['.ts']
  }
};

const cdnConfig = {
  ...typescript,
  target: 'web',
  mode: 'production',
  output: {
    filename: 'wallet.min.js',
    libraryTarget: 'window',
    path: path.resolve(__dirname, 'dist')
  }
};

const cdnDebugConfig = {
  ...typescript,
  ...cdnConfig,
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    ...cdnConfig.output,
    filename: 'wallet.debug.js'
  }
};

const nodeConfig = {
  ...typescript,
  target: 'node',
  output: {
    filename: 'wallet.node.js',
    path: path.resolve(__dirname, 'dist')
  }
};

const nodeDebugConfig = {
  ...typescript,
  ...nodeConfig,
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    ...cdnConfig.output,
    filename: 'wallet.node.debug.js'
  }
};

module.exports = [nodeConfig, nodeDebugConfig, cdnConfig, cdnDebugConfig];
