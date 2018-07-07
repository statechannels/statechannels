import { Channel, State, toHex32, padBytes32 } from 'fmg-core';
import { soliditySha3 } from 'web3-utils';

import Enum from 'enum';

class RpsGame {
  static restingState({ channnel, resolution, turnNum, stake }) {
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

  // Returns 2 if playerA won, 1 if a draw, 0 if playerB won
  static aWinningsMultiplier(aPlay, bPlay) {
    const diff = aPlay - bPlay;
    // if diff == 1 (mod 3) => a won, 0 (mod 3) => draw, -1 (mod 3) => b won
    return (diff + 4) % 3;
  }
}

RpsGame.Plays = new Enum(['NONE', 'ROCK', 'PAPER', 'SCISSORS', 'NONE']);

RpsGame.PositionTypes = new Enum(['NONE', 'RESTING', 'ROUNDPROPOSED', 'ROUNDACCEPTED', 'REVEAL', 'NONE'])

export { RpsGame };

class RpsBaseState extends State {
  constructor({ channel, stateType, stateCount, resolution, turnNum, preCommit, stake, aPlay, bPlay, salt }) {
    super({ channel, stateCount, resolution, turnNum });
    this.preCommit = preCommit;
    this.aPlay = aPlay || RpsGame.Plays.NONE;
    this.bPlay = bPlay || RpsGame.Plays.NONE;
    this.salt = salt;
    this.stake = stake;
  }

  isPreReveal() { return true; }

  static hashCommitment(play, salt) {
    return soliditySha3(
      { type: 'uint256', value: play.value },
      { type: 'bytes32', value: padBytes32(salt) }
    );
  }

  toHex() {
    return (
      super.toHex() +
      toHex32(this.positionType.value).substr(2) +
      toHex32(this.stake || 0).substr(2) +
      padBytes32(this.preCommit || "0x0").substr(2) +
      toHex32(this.bPlay.value).substr(2) +
      toHex32(this.isPreReveal() ? 0 : this.aPlay.value).substr(2) +
      padBytes32(this.isPreReveal() ? "0x0" : this.salt || "0x0").substr(2)
    );
  }
}

// needs to store/copy game-specific attributes, but needs to behave like a framework state
class InitializationState extends RpsBaseState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.PREFUNDSETUP;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}

class FundConfirmationState extends RpsBaseState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.POSTFUNDSETUP;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}

class ProposeState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, aPlay, salt }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.ROUNDPROPOSED;
    this.preCommit = this.constructor.hashCommitment(aPlay, salt);
  }
}

class AcceptState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.ROUNDACCEPTED;
  }
}

class RevealState extends RpsBaseState {
  constructor({ channel, resolution, turnNum, stake, aPlay, bPlay, salt}) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.REVEAL;
  }
  isPreReveal() { return false; };
}

class RestState extends RpsBaseState {
  constructor({ channnel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
  isPreReveal() { return false; };
}

class ConclusionState extends RpsBaseState {
  constructor({ channel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.CONCLUDE;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}
