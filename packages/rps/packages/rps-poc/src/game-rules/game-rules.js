import { Channel, State, toHex32, padBytes32 } from 'fmg-core';
import { soliditySha3 } from 'web3-utils';

import Enum from 'enum';

class RpsGame {
  static initializationState({ channel, stateCount, resolution, turnNum, stake }) {
    return new InitializationState(...arguments);
  }

  static fundConfirmationState({ channel, stateCount, resolution, turnNum, stake }) {
    return new FundConfirmationState(...arguments);
  }

  static restingState({ channnel, resolution, turnNum, stake }) {
    return new RestState(...arguments);
  }

  static proposeState({ channel, resolution, turnNum, stake, aPlay, salt }) {
    let preCommit = ProposeState.hashCommitment(aPlay, salt);
    var args = [].slice.call(arguments);
    return new ProposeState(...args.slice(0, 4).concat([preCommit]));
  }

  static acceptState({ channel, resolution, turnNum, stake, preCommit, bPlay }) {
    return new AcceptState(...arguments);
  }

  static revealState({ channel, resolution, turnNum, stake, aPlay, bPlay, salt }) {
    return new RevealState(...arguments);
  }

  static conclusionState({ channel, resolution, turnNum }) {
    return new ConclusionState({
      channel,
      resolution,
      turnNum,
    })
  }

  static result(aPlay, bPlay) {
    if (aPlay === bPlay) {
      return this.Results.TIE;
    }
    if (aPlay === 'ROCK') {
      if (bPlay === 'SCISSORS') {
        return this.Results.A;
      }
      if (bPlay === 'PAPER') {
        return this.Results.B;
      }
    } else if (aPlay === 'SCISSORS') {
      if (bPlay === 'PAPER') {
        return this.Results.A;
      }
      if (bPlay === 'ROCK') {
        return this.Results.B;
      }
    } else if (aPlay === 'PAPER') {
      if (bPlay === 'ROCK') {
        return this.Results.A;
      }
      if (bPlay === 'SCISSORS') {
        return this.Results.B;
      }
    }

    throw 'Invalid plays';
  }
}

RpsGame.Plays = new Enum(['NONE', 'ROCK', 'PAPER', 'SCISSORS']);
RpsGame.PositionTypes = new Enum([
  'NONE',
  'RESTING',
  'ROUNDPROPOSED',
  'ROUNDACCEPTED',
  'REVEAL',
  'NONE',
]);
RpsGame.Results = new Enum(['TIE', 'A', 'B']);

export { RpsGame };

class RpsState extends State {
  constructor({
    channel,
    stateCount,
    resolution,
    turnNum,
    preCommit,
    stake,
    aPlay,
    bPlay,
    salt,
  }) {
    super({ channel, stateCount, resolution, turnNum });
    this.preCommit = preCommit;
    this.aPlay = aPlay || RpsGame.Plays.NONE;
    this.bPlay = bPlay || RpsGame.Plays.NONE;
    this.salt = salt;
    this.stake = stake;
  }

  _isPreReveal() {
    return true;
  }

  static hashCommitment(play, salt) {
    return soliditySha3(
      { type: 'uint256', value: play.value },
      { type: 'bytes32', value: padBytes32(salt) },
    );
  }

  toHex() {
    return (
      super.toHex() +
      toHex32(this.positionType.value).substr(2) +
      toHex32(this.stake || 0).substr(2) +
      padBytes32(this.preCommit || '0x0').substr(2) +
      toHex32(this.bPlay.value).substr(2) +
      toHex32(this._isPreReveal() ? 0 : this.aPlay.value).substr(2) +
      padBytes32(this._isPreReveal() ? '0x0' : this.salt || '0x0').substr(2)
    );
  }

  static fromHex(state) {
    state = state.substr(2);

    // Universal deserialization
    // TODO: This should be in the fmg-core package
    let channelType = extractBytes(state, 32);
    state = state.substr(64);

    let channelNonce = extractInt({ state });
    state = state.substr(64);

    let numberOfParticipants = extractInt({ state });
    state = state.substr(64);

    let participants = [];

    for (let i = 0; i < numberOfParticipants; i++) {
      let participant = extractBytes(state, 32);
      participant = '0x' + participant.substr(2 + 64 - 40);
      participants.push(participant);
      state = state.substr(64);
    }
    let channel = new Channel(channelType, channelNonce, participants);

    let stateType = extractInt({ state });
    state = state.substr(64);

    let turnNum = extractInt({ state });
    state = state.substr(64);

    let stateCount = extractInt({ state });
    state = state.substr(64);

    let resolution = [];
    for (let i = 0; i < numberOfParticipants; i++) {
      resolution.push(extractInt({ state }));
      state = state.substr(64);
    }

    // Game state
    let positionType = extractInt({ state });
    positionType = RpsGame.PositionTypes.get(positionType);
    state = state.substr(64);

    let stake = extractInt({ state });
    state = state.substr(64);

    let preCommit = extractBytes(state, 32);
    state = state.substr(64);

    let bPlay = extractInt({ state });
    bPlay = RpsGame.Plays.get(bPlay) || RpsGame.Plays.NONE;
    state = state.substr(64);

    let aPlay = extractInt({ state });
    aPlay = RpsGame.Plays.get(aPlay) || RpsGame.Plays.NONE;
    state = state.substr(64);

    // TODO: This should probably be extractBytes32
    let salt = extractBytes(state, 32);
    state = state.substr(64);

    if (stateType === 0) {
      // PreFundSetup
      return new InitializationState({ channel, stateCount, resolution, turnNum, stake });
    }
    if (stateType === 1) {
      // PostFundSetup
      return new FundConfirmationState({ channel, stateCount, resolution, turnNum, stake });
    }
    if (stateType === 3) {
      // Conclude
      return new ConclusionState({ channel, resolution, turnNum });
    }

    if (positionType.is('RESTING')) {
      state = new RestState({ channel, stateCount, resolution, turnNum, stake });
    } else if (positionType.is('ROUNDPROPOSED')) {
      state = new ProposeState({ channel, resolution, turnNum, stake, aPlay, salt });
    } else if (positionType.is('ROUNDACCEPTED')) {
      state = new AcceptState({ channel, resolution, turnNum, stake, preCommit, bPlay });
    } else if (positionType.is('REVEAL')) {
      state = new RevealState({ channel, resolution, turnNum, stake, aPlay, bPlay, salt });
    }

    return state;
  }
}

function extractInt({ state, numBytes }) {
  numBytes = numBytes || 32;
  return parseInt(extractBytes(state, numBytes), 16);
}

function extractBytes(s, numBytes) {
  return '0x' + s.substr(0, numBytes * 2);
}

export { RpsState };

// needs to store/copy game-specific attributes, but needs to behave like a framework state
class InitializationState extends RpsState {
  constructor({ channel, stateCount, resolution, turnNum }) {
    stateCount = stateCount || 0;
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
  constructor({ channel, resolution, turnNum, stake, aPlay, bPlay, salt }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.REVEAL;
  }
  _isPreReveal() {
    return false;
  }
}

class RestState extends RpsState {
  constructor({ channnel, resolution, turnNum, stake }) {
    super(...arguments);
    this.stateType = State.StateTypes.GAME;
    this.positionType = RpsGame.PositionTypes.RESTING;
    this.stake = stake;
  }
  _isPreReveal() {
    return false;
  }
}

class ConclusionState extends RpsState {
  constructor({ channel, resolution, turnNum }) {
    super(...arguments);
    this.stateType = State.StateTypes.CONCLUDE;
    this.positionType = RpsGame.PositionTypes.RESTING;
  }
}
