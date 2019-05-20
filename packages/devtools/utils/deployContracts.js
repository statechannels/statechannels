const Logger = require("./logger.js").Logger;
const { getNetworkName } = require("./networkSetup.js");
const { configureEnvVariables } = require("../config/env.js");

module.exports = {
  deployContracts: function() {
    configureEnvVariables();
    const path = require("path");
    const { spawn } = require("child_process");
    let targetNetwork = "development";
    if (!process.env.TARGET_NETWORK && !!process.env.CHAIN_NETWORK_ID) {
      targetNetwork = getNetworkName(parseInt(process.env.CHAIN_NETWORK_ID));
    } else if (!!process.env.TARGET_NETWORK) {
      targetNetwork = process.env.TARGET_NETWORK;
    }
    process.env.GANACHE_HOST = process.env.GANACHE_HOST || "127.0.0.1";
    process.env.GANACHE_PORT = process.env.GANACHE_PORT || 8545;
    // It is assumed that truffle is installed as a dependency of your project.
    const trufflePath = path.resolve(
      __dirname,
      process.cwd() + "/node_modules/.bin/truffle"
    );

    const migrate = spawn(trufflePath, ["migrate", "--network", targetNetwork]);
    migrate.stdout.on("data", function(data) {
      Logger.log("DATA: ", data.toString());
      console.log("DATA: ", data.toString());
    });
    migrate.stderr.on("data", function(data) {
      Logger.log("ERROR: " + data);
      console.log("ERROR: " + data);
    });

    return new Promise(function(resolve, reject) {
      migrate.addListener("error", error => {
        Logger.error(error);
        console.error(error);
        reject(error);
      });

      migrate.addListener("exit", exitCode => {
        if (exitCode === 0) {
          resolve();
        } else {
          process.exit(exitCode);
        }
      });
    });
  }
};
