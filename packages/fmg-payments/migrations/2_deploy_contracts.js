var PaymentGame = artifacts.require("./PaymentGame.sol");
var PaymentState = artifacts.require("./PaymentState.sol");
var Commitment = artifacts.require("fmg-core/contracts/Commitment.sol");

module.exports = function(deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, PaymentState);
  deployer.deploy(PaymentState);
  deployer.link(PaymentState, PaymentGame);
  deployer.link(Commitment, PaymentGame);
  deployer.deploy(PaymentGame);
};
