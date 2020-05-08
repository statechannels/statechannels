const merge = require('webpack-merge');
const common = require('./webpack.config.js');

const TerserPlugin = require('terser-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          // We keep function names because various workflows use Function.name to refer
          // to actions that an xstate machine will trigger under certain conditions
          // eslint-disable-next-line @typescript-eslint/camelcase
          keep_fnames: true
        }
      })
    ]
  }
});
