import { State } from 'fmg-core';
import { packRestingAttributes } from '.';

export default class PreFundSetup extends State {
  stake: number;
  turnNum: number;
  stateCount: number;
  balances: number[];
  resolution: any;

  constructor(channel, turnNum: number, balances: number[], stateCount: number, stake: number) {
    const stateType = State.StateTypes.PREFUNDSETUP;
    super({ channel, stateType, turnNum, stateCount, resolution: balances });
    this.stake = stake;
  }

  toHex() {
    return super.toHex() + packRestingAttributes(this.stake);
  }
}
