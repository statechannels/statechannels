import { State } from 'fmg-core';
import { packRestingAttributes } from '.';
import BN from 'bn.js';

export default class PostFundSetup extends State {
  stake: BN;

  constructor(
    channel,
    turnNum: number,
    balances: BN[],
    stateCount: number,
    stake: BN,
  ) {
    const stateType = State.StateType.PostFundSetup;
    super({ channel, stateType, turnNum, stateCount, resolution: balances });
    this.stake = stake;
  }

  toHex() {
    return super.toHex() + packRestingAttributes(this.stake);
  }
}
