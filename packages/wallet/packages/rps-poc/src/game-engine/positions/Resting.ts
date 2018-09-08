import { State } from 'fmg-core';
import { packRestingAttributes } from '.';
import BN from 'bn.js';

export default class Resting extends State {
  stake: BN;

  constructor(channel, turnNum: number, balances: BN[], stake: BN) {
    const stateType = State.StateType.Game;
    super({ channel, stateType, turnNum, resolution: balances });
    this.stake = stake;
  }

  toHex() {
    return super.toHex() + packRestingAttributes(this.stake);
  }
}
