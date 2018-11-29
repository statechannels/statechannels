import { State } from '..';
import abi from 'web3-eth-abi';

class CountingGame {
  static preFundSetupState(opts) {
    return new PreFundSetupState(opts);
  }
  static postFundSetupState(opts) {
    return new PostFundSetupState(opts);
  }
  static gameState(opts) {
    return new GameState(opts);
  }
  static concludeState(opts) {
    return new ConcludeState(opts);
  }
}

const SolidityCountingStateType = {
  "CountingStateStruct": {
    "gameCounter": "uint256",
  },
};

class CountingBaseState extends State {
  gameCounter: number;

  constructor({ channel, turnNum, stateCount, resolution, gameCounter }) {
    super({ channel, turnNum, stateCount, resolution, stateType: undefined });
    this.gameCounter = gameCounter;
    this.initialize();
  }

  // tslint:disable-next-line:no-empty
  initialize() {}

  get gameAttributes() {
    return abi.encodeParameter(SolidityCountingStateType, [this.gameCounter]);
  }
}

class PreFundSetupState extends CountingBaseState {
  initialize() {
    this.stateType = State.StateType.PreFundSetup;
  }
}

class PostFundSetupState extends CountingBaseState {
  initialize() {
    this.stateType = State.StateType.PostFundSetup;
  }
}

class GameState extends CountingBaseState {
  initialize() {
    this.stateType = State.StateType.Game;
  }
}

class ConcludeState extends CountingBaseState {
  initialize() {
    this.stateType = State.StateType.Conclude;
  }
}

export { CountingGame };
