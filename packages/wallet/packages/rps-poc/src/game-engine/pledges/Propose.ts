import { State } from 'fmg-core';
import { packProposeAttributes, hashCommitment, Play } from '.';

export default class Resting extends State {
  static createWithPlayAndSalt (
    channel,
    turnNum: number,
    balances: number[],
    stake: number,
    aPlay: Play,
    salt: string,
  ) {
    const preCommit = hashCommitment(aPlay, salt);
    return new Resting(channel, turnNum, balances, stake, preCommit);
  }

  stake: number;
  preCommit: string;

  constructor(
    channel,
    turnNum: number,
    balances: number[],
    stake: number,
    preCommit: string,
  ) {
    const stateType = State.StateType.Game;
    super({ channel, stateType, turnNum, resolution: balances });
    this.stake = stake;
    this.preCommit = preCommit;
  }

  toHex() {
    return super.toHex() + packProposeAttributes(this.stake, this.preCommit);
  }
}
