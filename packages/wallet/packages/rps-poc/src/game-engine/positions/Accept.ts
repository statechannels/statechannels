import { State } from 'fmg-core';
import { packAcceptAttributes, Play } from '.';
import BN from 'bn.js';

export default class Accept extends State {
  stake: BN;
  preCommit: string;
  bPlay: Play;

  constructor(
    channel,
    turnNum: number,
    balances: BN[],
    stake: BN,
    preCommit: string,
    bPlay: Play,
  ) {
    const stateType = State.StateType.Game;
    super({ channel, stateType, turnNum, resolution: balances });
    this.stake = stake;
    this.preCommit = preCommit;
    this.bPlay = bPlay;
  }

  toHex() {
    return super.toHex() + packAcceptAttributes(this.stake, this.preCommit, this.bPlay);
  }
}
