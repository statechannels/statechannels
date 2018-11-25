module.exports = {
    startGanache: function () {
        let argv = process.argv.slice(2);
        let verbose = argv.indexOf('-v') >= 0
        let deterministic = argv.indexOf('-d') >= 0

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
        console.log(__dirname);
        var ganache = require("ganache-cli");
        console.log(`Starting ganache on port ${process.env.DEV_GANACHE_PORT}`);

        const detect = require('detect-port');
        return detect(process.env.DEV_GANACHE_PORT)
            .then(_port => {
                const portInUse = _port != process.env.DEV_GANACHE_PORT;
                if (portInUse) {
                    console.log(`Port ${process.env.DEV_GANACHE_PORT} in use. Assuming a ganache instance on that port.`);
                    return Promise.resolve();
                } else {
                    var ganacheServer = ganache.server({
                        port: process.env.DEV_GANACHE_PORT,
                        network_id: 0,
                        accounts,
                        logger: console,
                        verbose: verbose,
                        deterministic: deterministic
                    });

                    const {
                        promisify
                    } = require('util');
                    const listenAsync = promisify(ganacheServer.listen);
                    return listenAsync(process.env.DEV_GANACHE_PORT);
                }
            })
            .catch(err => {
                console.log(err);
            });

    }
}