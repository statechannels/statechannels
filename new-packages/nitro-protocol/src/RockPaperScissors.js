import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';
import { soliditySha3 } from 'web3-utils';

class Position {
  constructor(positionType, aBal, bBal, stake, preCommit, bPlay, aPlay, salt) {
    this.positionType = positionType;
    this.aBal = aBal;
    this.bBal = bBal;
    this.stake = stake;
    this.preCommit = padBytes32(preCommit);
    this.bPlay = bPlay;
    this.aPlay = aPlay;
    this.salt = padBytes32(salt);
  }

  toHex() {
    return (
      toHex32(this.positionType) +
      toHex32(this.aBal).substr(2) +
      toHex32(this.bBal).substr(2) +
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
      parseInt(`0x${hexString.substr(66, 64)}`), // aBal
      parseInt(`0x${hexString.substr(130, 64)}`), // bBal
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

Position.Plays = {
  ROCK: 0,
  PAPER: 1,
  SCISSORS: 2,
}
Object.freeze(Position.Plays);

export { Position };
