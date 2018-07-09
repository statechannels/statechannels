import { Channel, State, toHex32, padBytes32 } from 'fmg-core';
import { soliditySha3 } from 'web3-utils';

import Enum from 'enum';

class RpsGame {
  static restingState({ channnel, resolution, turnNum, stake }) {
    return new RestState(...arguments);
  }
  static proposeState({ channel, resolution, turnNum, stake, aPlay, salt }) {
    let preCommit = ProposeState.hashCommitment(aPlay, salt)
    var args = [].slice.call(arguments);
    return new ProposeState(...args.slice(0,4).concat([preCommit]));
  }
  static acceptState({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    return new AcceptState(...arguments);
  }
  static revealState({ channel, resolution, turnNum, stake, aPlay, bPlay, salt}) {
    return new RevealState(...arguments);
  }
}

RpsGame.Plays = new Enum(['NONE', 'ROCK', 'PAPER', 'SCISSORS']);

RpsGame.PositionTypes = new Enum(['NONE', 'RESTING', 'ROUNDPROPOSED', 'ROUNDACCEPTED', 'REVEAL', 'NONE'])

export { RpsGame };

class RpsState extends State {
  constructor({ channel, stateType, stateCount, resolution, turnNum, preCommit, stake, aPlay, bPlay, salt }) {
    super({ channel, stateCount, resolution, turnNum });
    this.preCommit = preCommit;
    this.aPlay = aPlay || RpsGame.Plays.NONE;
    this.bPlay = bPlay || RpsGame.Plays.NONE;
    this.salt = salt;
    this.stake = stake;
  }

  _isPreReveal() { return true; }

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
      toHex32(this._isPreReveal() ? 0 : this.aPlay.value).substr(2) +
      padBytes32(this._isPreReveal() ? "0x0" : this.salt || "0x0").substr(2)
    );
  }

  static fromHex(state) {
    state = state.substr(2);

    // Universal deserialization
    // TODO: This should be in the fmg-core package
    let channelType = extractBytes(state);
    state = state.substr(64);

    let channelNonce = extractBytes32(state);
    state = state.substr(64);

    let numberOfParticipants = extractBytes32(state);
    state = state.substr(64);

    let participants = [];

    for (let i = 0; i < numberOfParticipants; i++ ) {
      let participant = extractBytes(state);
      participants.push(participant);
      state = state.substr(64);
    }
    let channel = new Channel(channelType, channelNonce, participants);

    let stateType = extractBytes32(state);
    state = state.substr(64);

    let turnNum = extractBytes32(state);
    state = state.substr(64);

    let stateCount = extractBytes32(state);
    state = state.substr(64);

    let resolution = []
    for (let i = 0; i < numberOfParticipants; i++ ) {
      resolution.push(extractBytes32(state));
      state = state.substr(64);
    }

    if (stateType === 0) { // PreFundSetup
      return new InitializationState({channel, stateCount, resolution, turnNum});
    } else if (stateType === 1) { // PostFundSetup
      return new FundConfirmationState({channel, stateCount, resolution, turnNum})
    } else if (stateType === 3) { // Conclude
      return new ConclusionState({channel, resolution, turnNum})
    }

    // Game state
    let positionType = extractBytes32(state);
    positionType = RpsGame.PositionTypes.get(parseInt(positionType))
    state = state.substr(64);

    let stake = extractBytes32(state);
    state = state.substr(64);

    let preCommit = extractBytes(state);
    state = state.substr(64);

    let bPlay = extractBytes32(state);
    bPlay = RpsGame.Plays.get(bPlay) || RpsGame.Plays.NONE;
    state = state.substr(64);

    let aPlay = extractBytes32(state);
    aPlay = RpsGame.Plays.get(aPlay) || RpsGame.Plays.NONE;
    state = state.substr(64);

    // TODO: This should probably be extractBytes32
    let salt = extractBytes(state);
    state = state.substr(64);

    if (positionType.is('RESTING')) {
      state = new RestState({channel, stateCount, resolution, turnNum, stake});
    }
    else if (positionType.is('ROUNDPROPOSED')) {
      state = new ProposeState({channel, resolution, turnNum, stake, aPlay, salt});
    }
    else if (positionType.is('ROUNDACCEPTED')) {
      state = new AcceptState({channel, resolution, turnNum, stake, preCommit, bPlay});
    }
    else if (positionType.is('REVEAL')) {
      state = new RevealState({channel, resolution, turnNum, stake, aPlay, bPlay, salt})
    }

    return state
  }
}

function extractBytes32(s) {
  return parseInt('0x' + s.substr(0, 64));
}

function extractBytes(s) {
  return '0x' + s.substr(0, 64).replace(/^0+/, '');
}

export { RpsState };

// needs to store/copy game-specific attributes, but needs to behave like a framework state
class InitializationState extends RpsState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.PREFUNDSETUP;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}

class FundConfirmationState extends RpsState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.POSTFUNDSETUP;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}

class ProposeState extends RpsState {
  constructor({ channel, resolution, turnNum, stake, preCommit }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.ROUNDPROPOSED;
  }
}

class AcceptState extends RpsState {
  constructor({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.ROUNDACCEPTED;
  }
}

class RevealState extends RpsState {
  constructor({ channel, resolution, turnNum, stake, aPlay, bPlay, salt}) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.REVEAL;
  }
  _isPreReveal() { return false; };
}

class RestState extends RpsState {
  constructor({ channnel, resolution, turnNum, stake }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.RESTING;
    this.stake = stake;
  }
  _isPreReveal() { return false; };
}

class ConclusionState extends RpsState {
  constructor({ channel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.CONCLUDE;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}
