// TODO connect to *existing* ganache. Here we start a new instance to aid development.

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'development';
process.env.NODE_ENV = 'development';

let ganacheServer;
let devServer;
// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  if (ganacheServer) {
    ganacheServer.close();
  }
  if (devServer) {
    devServer.close();
  }
  throw err;
});

// Ensure environment variables are read.
require('../config/env');

const chalk = require('chalk');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const checkRequiredFiles = require('react-dev-utils/checkRequiredFiles');
const {choosePort} = require('react-dev-utils/WebpackDevServerUtils');

const paths = require('../config/paths');
const configFactory = require('../config/webpack.config');
const {getNetworkName, setupGanache} = require('@statechannels/devtools');
const {deploy} = require('../deployment/deploy');

void (async () => {
  process.on('SIGINT', () => {
    if (devServer) {
      devServer.close();
    }
  });
  process.on('SIGTERM', () => {
    if (devServer) {
      devServer.close();
    }
  });
  //Allows the use of async/await
  // Warn and crash if required files are missing
  if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
    process.exit(1);
  }

  // Tools like Cloud9 rely on this.
  const DEFAULT_PORT = !!process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  if (process.env.HOST) {
    console.log(
      chalk.cyan(
        `Attempting to bind to HOST environment variable: ${chalk.yellow(
          chalk.bold(process.env.HOST)
        )}`
      )
    );
    console.log(
      `If this was unintentional, check that you haven't mistakenly set it in your shell.`
    );
    console.log(`Learn more here: ${chalk.yellow('http://bit.ly/2mwWSwH')}`);
    console.log();
  }

  // We attempt to use the default port but if it is busy, we offer the user to
  // run on a different port. `choosePort()` Promise resolves to the next free port.
  const port = await choosePort(HOST, DEFAULT_PORT);
  if (port == null) {
    console.error('Could not find a port to run the web-server on');
    process.exit(1);
  }

  const {deployer} = await setupGanache(process.env.RPS_DEPLOYER_ACCOUNT_INDEX);
  const deployedArtifacts = await deploy(deployer);

  process.env = {...process.env, ...deployedArtifacts};

  process.env.TARGET_NETWORK = getNetworkName(process.env.CHAIN_NETWORK_ID);

  const config = configFactory('development');
  // Serve webpack assets generated by the compiler over a web sever.
  devServer = new WebpackDevServer(webpack(config), {
    hot: true,
    contentBase: paths.appPublic,
    compress: true,
  });
  // Launch WebpackDevServer.
  devServer.listen(port, HOST, err => {
    if (err) {
      return console.log(err);
    }
    console.log(chalk.cyan(`Starting the development server on http://${HOST}:${port} ...\n`));
  });
})();
