const ethers = require('ethers');
require("dotenv").config();

const privateKeyWithEth = "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d";
const ganacheProvider = new ethers.providers.JsonRpcProvider(`http://${process.env.DEV_GANACHE_HOST}:${process.env.DEV_GANACHE_PORT}`);

module.exports = {
    // the following private key is funded with 1 million eth in the startGanache function
    ganacheProvider: ganacheProvider,
    privateKeyWithEth: privateKeyWithEth,
    walletWithEthAndProvider: new ethers.Wallet(privateKeyWithEth, ganacheProvider),
    getNetworkId: async () => {
        return (await ganacheProvider.getNetwork()).chainId;
    }
}