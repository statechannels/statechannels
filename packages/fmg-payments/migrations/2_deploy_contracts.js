var PaymentApp = artifacts.require("./PaymentApp.sol");
var PaymentCommitment = artifacts.require("./PaymentCommitment.sol");
var Commitment = artifacts.require("fmg-core/contracts/Commitment.sol");

module.exports = function (deployer) {
  deployer.deploy(Commitment);

  deployer.link(Commitment, PaymentCommitment);
  deployer.deploy(PaymentCommitment);
  deployer.link(PaymentCommitment, PaymentApp);
  deployer.link(Commitment, PaymentApp);
  deployer.deploy(PaymentApp);
};