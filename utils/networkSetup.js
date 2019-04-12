require("dotenv").config();

const privateKeyWithEth = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";


module.exports = {
    // the following private key is funded with 1 million eth in the startGanache function
    getGanacheProvider: function () {
        const ethers = require('ethers');
        return new ethers.providers.JsonRpcProvider(`http://${process.env.DEV_GANACHE_HOST}:${process.env.DEV_GANACHE_PORT}`);
    },
    getPrivateKeyWithEth: function () {
        return privateKeyWithEth;
    },
    getWalletWithEthAndProvider: function () {
        const ethers = require('ethers');
        const ganacheProvider = new ethers.providers.JsonRpcProvider(`http://${process.env.DEV_GANACHE_HOST}:${process.env.DEV_GANACHE_PORT}`);
        return new ethers.Wallet(privateKeyWithEth, ganacheProvider);
    },
    getNetworkId: async () => {
        const ethers = require('ethers');
        const ganacheProvider = new ethers.providers.JsonRpcProvider(`http://${process.env.DEV_GANACHE_HOST}:${process.env.DEV_GANACHE_PORT}`);
        return (await ganacheProvider.getNetwork()).chainId;
    },
    getNetworkName: function (networkId) {
        switch (networkId) {
            case 1:
                return 'live';
            case 3:
                return 'ropsten';
            case 4:
                return 'rinkeby';
            case 42:
                return 'kovan';
            default:
                return 'development';
        }
    }
}