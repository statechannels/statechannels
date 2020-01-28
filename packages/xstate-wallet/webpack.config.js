// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const HtmlWebpackPlugin = require('html-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  devtool: 'inline-source-map',
  output: {
    filename: 'bundle.js',
    path: __dirname + '/build'
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
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          // Creates `style` nodes from JS strings
          'style-loader',
          // Translates CSS into CommonJS
          'css-loader',
          // Compiles Sass to CSS
          'sass-loader'
        ]
      },
      {
        loader: require.resolve('file-loader'),
        // Exclude `js` files to keep "css" loader working as it injects
        // its runtime that would otherwise be processed through "file" loader.
        // Also exclude `html` and `json` extensions so they get processed
        // by webpacks internal loaders.
        exclude: [/\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/, /\.s[ac]ss$/i],
        options: {
          name: 'static/media/[name].[hash:8].[ext]'
        }
      }
    ]
  },
  // TODO: Generate a proper collection of allowed env variables
  plugins: [
    new webpack.EnvironmentPlugin(['ETH_ASSET_HOLDER_ADDRESS', 'HUB_ADDRESS', 'CHAIN_NETWORK_ID']),
    new HtmlWebpackPlugin({template: './index-template.html'})
  ],

  resolve: {
    extensions: ['.tsx', '.ts', '.js']
    // This may be needed: react hooks may not work
    // due to having multiple versions of react installed
    // see https://github.com/facebook/react/issues/13991
    // alias: {
    //   react: path.resolve('./node_modules/react')
    // }
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
