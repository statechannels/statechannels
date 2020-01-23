import merge from 'webpack-merge';
import common from './webpack.config.js';

export default merge(common, {
  mode: 'production'
});
