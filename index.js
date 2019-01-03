const { startGanache } = require('./utils/startGanache');
const { deployContracts } = require('./utils/deployContracts');
const { runJest } = require('./utils/runJest');
const { expectEvent } = require('./utils/expectEvent');
const { linkedByteCode } = require('./utils/linkedByteCode');
const { assertRevert } = require('./utils/assertRevert');
const { increaseTime, DURATION } = require('./utils/increaseTime');
const {
    getGanacheProvider,
    getPrivateKeyWithEth,
    getWalletWithEthAndProvider,
    getNetworkId
} = require("./utils/networkSetup");

module.exports = {
    startGanache,
    deployContracts,
    runJest,
    expectEvent,
    linkedByteCode,
    assertRevert,
    increaseTime,
    DURATION,
    getGanacheProvider,
    getPrivateKeyWithEth,
    getWalletWithEthAndProvider,
    getNetworkId,
};