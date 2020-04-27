const {spawn} = require('child_process');
const {configureEnvVariables} = require('@statechannels/devtools');

void (() => {
  /**
   * The purpose of this file is simply to run configureEnvVariables
   * before executing react-scripts build.
   */
  configureEnvVariables();

  return spawn('yarn', ['run', 'react-scripts', 'build'], {stdio: 'inherit'}).on(
    'close',
    process.exit
  );
})();
