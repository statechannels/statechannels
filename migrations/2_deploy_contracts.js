var ChannelManager = artifacts.require("./ChannelManager.sol");

module.exports = function(deployer) {
  deployer.deploy(ChannelManager);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
