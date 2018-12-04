const { startGanache } = require('./utils/startGanache');
const { deployContracts } = require('./utils/deployContracts');
const { runJest } = require('./utils/runJest');
const { expectEvent } = require('./utils/expectEvent');
const { linkedByteCode } = require('./utils/linkedByteCode');
const { ganacheProvider, privateKeyWithEth, walletWithEthAndProvider, getNetworkId } = require("./utils/networkSetup");

module.exports = {
    startGanache,
    deployContracts,
    runJest,
    expectEvent,
    linkedByteCode,
    ganacheProvider,
    privateKeyWithEth,
    walletWithEthAndProvider,
    getNetworkId,
};