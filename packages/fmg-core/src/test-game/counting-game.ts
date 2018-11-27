import { State, toHex32 } from '..';

class CountingGame {
  static preFundSetupState(opts) {
    return new PreFundSetupState(opts);
  }
  static PostFundSetupState(opts) {
    return new PostFundSetupState(opts);
  }
  static gameState(opts) {
    return new GameState(opts);
  }
  static concludeState(opts) {
    return new ConcludeState(opts);
  }
}

class CountingBaseState extends State {
  gameCounter: number;

  constructor({ channel, turnNum, stateCount, resolution, gameCounter }) {
    super({ channel, turnNum, stateCount, resolution, stateType: undefined });
    this.gameCounter = gameCounter;
    this.initialize();
  }

  // tslint:disable-next-line:no-empty
  initialize() {}

  toHex() {
    return super.toHex() + toHex32(this.gameCounter).substr(2);
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
