const {spawn} = require('child_process');
const {configureEnvVariables} = require('@statechannels/devtools');

void (() =>
  /**
   * The purpose of this file is simply to run configureEnvVariables
   * before executing the webpack build command.
   */
  configureEnvVariables() &&
  spawn(
    'yarn', ['run', 'webpack', '--config', './webpack-build.config.js'],
    {
      stdio: 'inherit'
    }
  ).on('close', process.exit)
)();
