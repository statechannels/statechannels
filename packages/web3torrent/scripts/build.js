const {spawn} = require('child_process');
const {configureEnvVariables} = require('@statechannels/devtools');

/**
 * The purpose of this file is simply to run configureEnvVariables
 * before executing the react-scripts build command.
 */

configureEnvVariables();

spawn('yarn', ['react-scripts', 'build'], {stdio: 'inherit'}).on('close', process.exit);
