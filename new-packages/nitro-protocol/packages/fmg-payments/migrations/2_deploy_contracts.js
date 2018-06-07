var PaymentGame = artifacts.require("./PaymentGame.sol");
var PaymentState = artifacts.require("./PaymentState.sol");
var State = artifacts.require("fmg-core/contracts/State.sol");

module.exports = function(deployer) {
  deployer.deploy(State);

  deployer.link(State, PaymentState);
  deployer.deploy(PaymentState);
  deployer.link(PaymentState, PaymentGame);
  deployer.link(State, PaymentGame);
  deployer.deploy(PaymentGame);
};
