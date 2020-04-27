const {spawn} = require('child_process');
const {configureEnvVariables} = require('@statechannels/devtools');

/**
 * The purpose of this file is simply to run configureEnvVariables
 * before executing the webpack build command.
 */
void (() =>
  configureEnvVariables() &&
  spawn('yarn', ['run', 'webpack', '--config', './webpack-build.config.js'], {
    stdio: 'inherit'
  }).on('close', process.exit))();
