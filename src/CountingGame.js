import { toHex32, padBytes32 } from './utils';
import { State } from './CommonState';


class Position {
  constructor(aBal, bBal, count) {
    this.aBal = aBal;
    this.bBal = bBal;
    this.count = count;
  }

  toHex() {
    return (
      "0x" +
      toHex32(this.aBal).substr(2) +
      toHex32(this.bBal).substr(2) +
      toHex32(this.count).substr(2)
    )
  }

  static fromHex(hexString) {
    return new Position(
      parseInt(`0x${hexString.substr(66, 64)}`), // aBal
      parseInt(`0x${hexString.substr(130, 64)}`), // bBal
      parseInt(`0x${hexString.substr(194, 64)}`), // count
    )
  }

  static initialPosition(aBal, bBal) {
    return new Position(aBal, bBal, 0);
  }

  next() {
    return new Position(this.aBal, this.bBal, this.count + 1);
  }
}

class CountingGame {
  static proposeState(opts) { return new ProposeState(opts); }
  static acceptState(opts) { return new AcceptState(opts); }
  static gameState(opts) { return new GameState(opts); }
  static concludeState(opts) { return new ConcludeState(opts); }
}

class CountingBaseState extends State {
  constructor({ channel, turnNum, stateCounter, resolution, gameCounter }) {
    super({ channel, turnNum, stateCounter, resolution });
    this.gameCounter = gameCounter;
    this.initialize();
  }

  initialize() {};

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

export { Position, CountingGame };