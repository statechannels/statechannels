import { State } from 'fmg-core';
import BN from 'bn.js';

export default class Conclude extends State {
  constructor(channel, turnNum: number, balances: BN[]) {
    const stateType = State.StateType.Conclude;
    super({ channel, stateType, turnNum, resolution: balances });
  }

  toHex() {
    return super.toHex();
  }
}
