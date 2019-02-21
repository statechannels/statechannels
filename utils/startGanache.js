const Logger = require("./logger.js").Logger;

module.exports = {
    startGanache: function (argv) {
        require("dotenv").config();
        let verbose = argv.v;
        let deterministic = argv.d;
        let network_id = argv.i || process.env.DEV_GANACHE_NETWORK_ID;
        let blockTime = argv.b || process.env.GANACHE_BLOCK_TIME || 1;

        process.env.DEV_GANACHE_PORT = process.env.DEV_GANACHE_PORT || 8545;
        //Default accounts to seed so we can have accounts with 1M ether for testing
        var accounts = [{
                secretKey: '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d',
                balance: '0xD3C21BCECCEDA1000000'
            },
            {
                secretKey: '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72',
                balance: '0xD3C21BCECCEDA1000000'
            },
            {
                secretKey: '0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1',
                balance: '0xD3C21BCECCEDA1000000'
            }
        ];
        var ganache = require("ganache-cli");
        Logger.log(`Starting ganache on port ${process.env.DEV_GANACHE_PORT}`);

        const detect = require('detect-port');
        return detect(process.env.DEV_GANACHE_PORT)
            .then(_port => {
                const portInUse = _port != process.env.DEV_GANACHE_PORT;
                if (portInUse) {
                    Logger.log(`Port ${process.env.DEV_GANACHE_PORT} in use. Assuming a ganache instance on that port.`);
                    return Promise.resolve();
                } else {
                    var ganacheServer = ganache.server({
                        port: process.env.DEV_GANACHE_PORT,
                        network_id: network_id,
                        accounts,
                        logger: Logger,
                        verbose: verbose,
                        deterministic: deterministic,
                        blockTime,
                    });

                    const {
                        promisify
                    } = require('util');
                    const listenAsync = promisify(ganacheServer.listen);
                    return listenAsync(process.env.DEV_GANACHE_PORT);
                }
            })
            .catch(err => {
                Logger.err(err);
            });

    }
}