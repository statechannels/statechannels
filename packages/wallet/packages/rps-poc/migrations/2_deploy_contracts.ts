const RockPaperScissorsGame = artifacts.require("./RockPaperScissorsGame.sol");
const RockPaperScissorsState = artifacts.require("./RockPaperScissorsState.sol");
const State = artifacts.require("fmg-core/contracts/State.sol");

export default function (deployer) {
  deployer.deploy(State);

  deployer.link(State, RockPaperScissorsState);
  deployer.deploy(RockPaperScissorsState);
  deployer.link(RockPaperScissorsState, RockPaperScissorsGame);
  deployer.link(State, RockPaperScissorsGame);
  deployer.deploy(RockPaperScissorsGame);
};
