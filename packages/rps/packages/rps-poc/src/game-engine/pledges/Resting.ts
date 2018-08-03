import { State } from 'fmg-core';
import { packRestingAttributes } from '.';

export default class Resting extends State {
  stake: number;

  constructor(channel, turnNum: number, balances: number[], stake: number) {
    const stateType = State.StateType.Game;
    super({ channel, stateType, turnNum, resolution: balances });
    this.stake = stake;
  }

  toHex() {
    return super.toHex() + packRestingAttributes(this.stake);
  }
}
