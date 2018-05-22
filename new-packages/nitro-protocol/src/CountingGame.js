import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

class Position {
  constructor(positionType, aBal, bBal, count) {
    this.positionType = positionType;
    this.aBal = aBal;
    this.bBal = bBal;
    this.count = count;
  }

  toHex() {
    return (
      toHex32(this.positionType) +
      toHex32(this.aBal).substr(2) +
      toHex32(this.bBal).substr(2) +
      toHex32(this.count).substr(2)
    )
  }

  static fromHex(hexString) {
    return new Position(
      parseInt(`0x${hexString.substr(2, 64)}`), // positionType
      parseInt(`0x${hexString.substr(66, 64)}`), // aBal
      parseInt(`0x${hexString.substr(130, 64)}`), // bBal
      parseInt(`0x${hexString.substr(194, 64)}`), // count
    )
  }
}

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  turnNum,
  positionType,
  aBal,
  bBal,
  count
) {
  let gamePosition = new Position(positionType, aBal, bBal, count);
  return packCommon(channelType, channelNonce, turnNum, participantA, participantB, gamePosition);
}
