import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

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

export { Position };
