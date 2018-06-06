import { State, toHex32, padBytes32 } from '../../..';

class CountingGame {
  static proposeState(opts) { return new ProposeState(opts); }
  static acceptState(opts) { return new AcceptState(opts); }
  static gameState(opts) { return new GameState(opts); }
  static concludeState(opts) { return new ConcludeState(opts); }
}

class CountingBaseState extends State {
  constructor({ channel, turnNum, stateCount, resolution, gameCounter }) {
    super({ channel, turnNum, stateCount, resolution });
    this.gameCounter = gameCounter;
    this.initialize();
  }

  initialize() {}

  toHex() {
    return super.toHex() + toHex32(this.gameCounter).substr(2);
  }
}

class ProposeState extends CountingBaseState {
  initialize() { this.stateType = State.StateTypes.PROPOSE; }
}

class AcceptState extends CountingBaseState {
  initialize() { this.stateType = State.StateTypes.ACCEPT; }
}

class GameState extends CountingBaseState {
  initialize() { this.stateType = State.StateTypes.GAME; }
}

class ConcludeState extends CountingBaseState {
  initialize() { this.stateType = State.StateTypes.CONCLUDE; }
}

export { CountingGame };