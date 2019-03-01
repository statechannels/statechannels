const Logger = require("./logger.js").Logger;

module.exports = {
    deployContracts: function () {
        require("dotenv").config();
        const path = require('path');
        const {
            spawn
        } = require('child_process');
        process.env.TARGET_NETWORK = process.env.TARGET_NETWORK || 'development';
        process.env.DEV_GANACHE_HOST = process.env.DEV_GANACHE_HOST || '127.0.0.1';
        process.env.DEV_GANACHE_PORT = process.env.DEV_GANACHE_PORT || 8545;
        // It is assumed that truffle is installed as a dependency of your project.
        const trufflePath = path.resolve(__dirname, process.cwd() + '/node_modules/.bin/truffle');


        const migrate = spawn(trufflePath, ['migrate', '--network', process.env.TARGET_NETWORK]);
        migrate.stdout.on('data', function (data) {
            Logger.log('DATA: ', data.toString());
            console.log('DATA: ', data.toString());
        });
        migrate.stderr.on('data', function (data) {
            Logger.log('ERROR: ' + data);
            console.log('ERROR: ' + data);

        });

        return new Promise(function (resolve, reject) {
            migrate.addListener("error", (error) => {
                Logger.error(error);
                console.error(error);
                reject(error);
            });

            migrate.addListener("exit", (exitCode) => {
                if (exitCode === 0) {
                    resolve()

                } else {
                    process.exit(exitCode)
                }
            });
        });
    }
}