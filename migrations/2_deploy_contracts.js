var RockPaperScissors = artifacts.require("./RockPaperScissors.sol");

module.exports = function(deployer) {
  deployer.deploy(RockPaperScissors);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
