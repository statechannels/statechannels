import { State } from 'fmg-core';
import { packRestingAttributes } from '.';
import BN from 'bn.js';

export default class PreFundSetup extends State {
  stake: BN;
  turnNum: number;
  stateCount: number;
  balances: BN[];
  resolution: any;

  constructor(channel, turnNum: number, balances: BN[], stateCount: number, stake: BN) {
    const stateType = State.StateType.PreFundSetup;
    super({ channel, stateType, turnNum, stateCount, resolution: balances });
    this.stake = stake;
  }

  toHex() {
    return super.toHex() + packRestingAttributes(this.stake);
  }
}
