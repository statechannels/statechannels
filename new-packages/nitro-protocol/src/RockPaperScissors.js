import { toHex32, padBytes32 } from './utils';
import { State } from './CommonState';
import { soliditySha3 } from 'web3-utils';

class Position {
  constructor(positionType, stake, preCommit, bPlay, aPlay, salt) {
    this.positionType = positionType;
    this.stake = stake;
    this.preCommit = padBytes32(preCommit);
    this.bPlay = bPlay;
    this.aPlay = aPlay;
    this.salt = padBytes32(salt);
  }

  toHex() {
    return (
      toHex32(this.positionType) +
      toHex32(this.stake).substr(2) +
      padBytes32(this.preCommit).substr(2) +
      toHex32(this.bPlay).substr(2) +
      toHex32(this.aPlay).substr(2) +
      padBytes32(this.salt).substr(2)
    )
  }

  static fromHex(hexString) {
    return new Position(
      parseInt(`0x${hexString.substr(2, 64)}`), // positionType
      parseInt(`0x${hexString.substr(194, 64)}`), // stake
      `0x${hexString.substr(258, 64)}`, // preCommit
      parseInt(`0x${hexString.substr(322, 64)}`), // bPlay
      parseInt(`0x${hexString.substr(386, 64)}`), // aPlay
      `0x${hexString.substr(450, 64)}`, // salt
    )
  }

  static initialPosition(aBal, bBal) {
    return new Position(Position.PositionTypes.RESTING, aBal, bBal, 0, "0x0", 0, 0, "0x0");
  }

  static hashCommitment(play, salt) {
    return soliditySha3(
      { type: 'uint256', value: play },
      { type: 'bytes32', value: padBytes32(salt) },
    );
  }

  propose(stake, aPlay, salt) {
    if(!this.positionType == Position.PositionTypes.RESTING) { throw "You can only call propose() from the RESTING position."; }

    const preCommit = Position.hashCommitment(aPlay, salt);
    return new Position(Position.PositionTypes.ROUNDPROPOSED, this.aBal - stake, this.bBal - stake, stake, preCommit, 0, 0, "0x0");
  }

  accept(bPlay) {
    if(!this.positionType == Position.PositionTypes.ROUNDPROPOSED) { throw "You can only call accept() from the ROUNDPROPOSED position."; }

    return new Position(Position.PositionTypes.ROUNDACCEPTED, this.aBal, this.bBal, this.stake, this.preCommit, bPlay, 0, "0x0");
  }

  reject() {
    if(!this.positionType == Position.PositionTypes.ROUNDPROPOSED) { throw "You can only call reject() from the ROUNDPROPOSED position."; };

    return new Position(Position.PositionTypes.RESTING, this.aBal + this.stake, this.bBal + this.stake, 0, "0x0", 0, 0, "0x0");
  }

  reveal(aPlay, salt) {
    if(!this.positionType == Position.PositionTypes.ROUNDACCEPTED) { throw "You can only call reveal() from the ROUNDACCEPTED position."; };

    return new Position(Position.PositionTypes.REVEAL, this.aBal, this.bBal, this.stake, this.preCommit, this.bPlay, aPlay, salt);
  }

  confirm() {
    if(!this.positionType == Position.PositionTypes.REVEAL) { throw "You can only call confirm() from the REVEAL position."; };
    const aWinnings = Position.aWinningsMultiplier(this.aPlay, this.bPlay) * this.stake;
    const bWinnings = 2 * this.stake - aWinnings;

    return new Position(Position.PositionTypes.RESTING, this.aBal + aWinnings, this.bBal + bWinnings, 0, "0x0", 0, 0, "0x0");
  }

  // Returns 2 if a won, 1 if a draw, 0 if b won
  static aWinningsMultiplier(aPlay, bPlay) {
    const diff = aPlay - bPlay;
    // if diff == 1 (mod 3) => a won, 0 (mod 3) => draw, -1 (mod 3) => b won
    return (diff + 4) % 3;
  }
}

Position.PositionTypes = {
  RESTING: 0,
  ROUNDPROPOSED: 1,
  ROUNDACCEPTED: 2,
  REVEAL: 3,
}
Object.freeze(Position.PositionTypes);

class RpsGame {
  static restingState({ channnel, resolution, turnNum }) {
    return new RestState(...arguments);
  }
  static proposeState({ channel, resolution, turnNum, stake, aPlay, salt }) {
    return new ProposeState(...arguments);
  }
  static acceptState({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    return new AcceptState(...arguments);
  }
  static revealState({ channel, resolution, turnNum, stake, aPlay, bPlay, salt}) {
    return new RevealState(...arguments);
  }
}

RpsGame.Plays = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
}
Object.freeze(Position.Plays);

export { Position, RpsGame };

class RpsBaseState extends State {
  constructor({ channel, stateType, stateCount, resolution, turnNum, preCommit, stake, aPlay, bPlay, salt }) {
    super({ channel, stateCount, resolution, turnNum });
    this.preCommit = preCommit;
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.salt = salt;
    this.stake = stake;
  }

  isPreReveal() { return true; }

  static hashCommitment(play, salt) {
    return soliditySha3(
      { type: 'uint256', value: play },
      { type: 'bytes32', value: padBytes32(salt) },
    );
  }

  toHex() {
    return (
      super.toHex() +
      toHex32(this.positionType).substr(2) +
      toHex32(this.stake || 0).substr(2) +
      padBytes32(this.preCommit || "0x0").substr(2) +
      toHex32(this.bPlay || 0).substr(2) +
      toHex32(this.isPreReveal() ? 0 : this.aPlay || 0).substr(2) +
      padBytes32(this.isPreReveal() ? "0x0" : this.salt || "0x0").substr(2)
    );
  }

}

// needs to store/copy game-specific attributes, but needs to behave like a framework state
class InitializationState extends RpsBaseState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.PROPOSE;
    this.positionType = Position.PositionTypes.RESTING;
  }
}

class FundConfirmationState extends RpsBaseState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.ACCEPT;
    this.positionType = Position.PositionTypes.RESTING;
  }
}

class ProposeState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, aPlay, salt }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = Position.PositionTypes.ROUNDPROPOSED;
    this.preCommit = this.constructor.hashCommitment(aPlay, salt);
  }
}

class AcceptState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = Position.PositionTypes.ROUNDACCEPTED;
  }
}

class RevealState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, aPlay, bPlay, salt}) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = Position.PositionTypes.REVEAL;
  }
  isPreReveal() { return false };
}

class RestState extends RpsBaseState {
  constructor({ channnel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = Position.PositionTypes.RESTING;
  }
  isPreReveal() { return false };
}

class ConclusionState extends RpsBaseState {
  constructor({ channel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.CONCLUDE;
    this.positionType = Position.PositionTypes.RESTING;
  }
}