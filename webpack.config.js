// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  output: {
    filename: 'bundle.js',
    path: __dirname
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre'
      },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {projectReferences: true}
      }
    ]
  },
  // TODO: Generate a proper collection of allowed env variables
  plugins: [
    new webpack.EnvironmentPlugin(['ETH_ASSET_HOLDER_ADDRESS', 'HUB_ADDRESS', 'CHAIN_NETWORK_ID'])
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  node: {
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    // eslint-disable-next-line @typescript-eslint/camelcase
    child_process: 'empty'
  }
};
