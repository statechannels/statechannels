import { State } from 'fmg-core';
import { packAcceptAttributes, Play } from '.';

export default class Accept extends State {
  stake: number;
  preCommit: string;
  bPlay: Play;

  constructor(
    channel,
    turnNum: number,
    balances: number[],
    stake: number,
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
    return super.toHex() + packAcceptAttributes(
      this.stake,
      this.preCommit,
      this.bPlay,
    );
  }
}
