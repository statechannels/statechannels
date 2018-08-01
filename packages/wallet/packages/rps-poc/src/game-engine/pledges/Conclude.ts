import { State } from 'fmg-core';

export default class Conclude extends State {
  constructor(channel, turnNum: number, balances: number[]) {
    const stateType = State.StateTypes.CONCLUDE;
    super({ channel, stateType, turnNum, resolution: balances });
  }

  toHex() {
    return super.toHex();
  }
}
