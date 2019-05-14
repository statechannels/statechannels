const { startGanache } = require("./utils/startGanache");
const { deployContracts } = require("./utils/deployContracts");
const { runJest } = require("./utils/runJest");
const { expectEvent } = require("./utils/expectEvent");
const { linkedByteCode } = require("./utils/linkedByteCode");
const { expectRevert } = require("./utils/expectRevert");
const { delay } = require("./utils/delay");
const { increaseTime, DURATION } = require("./utils/increaseTime");
const {
  getGanacheProvider,
  getPrivateKeyWithEth,
  getWalletWithEthAndProvider,
  getNetworkId,
  getNetworkName
} = require("./utils/networkSetup");

const { parseContractAddress, parseABI } = require("./utils/artifactParsers");
const { dotEnv } = require("./config/env.js");

module.exports = {
  startGanache,
  deployContracts,
  runJest,
  expectEvent,
  linkedByteCode,
  expectRevert,
  increaseTime,
  DURATION,
  getGanacheProvider,
  getPrivateKeyWithEth,
  getWalletWithEthAndProvider,
  getNetworkId,
  delay,
  getNetworkName,
  parseContractAddress,
  parseABI,
  dotEnv
};
