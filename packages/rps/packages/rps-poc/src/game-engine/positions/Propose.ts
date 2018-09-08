import { State } from 'fmg-core';
import { packProposeAttributes, hashCommitment, Play } from '.';
import BN from 'bn.js';

export default class Propose extends State {
  static createWithPlayAndSalt (
    channel,
    turnNum: number,
    balances: BN[],
    stake: BN,
    aPlay: Play,
    salt: string,
  ) {
    const preCommit = hashCommitment(aPlay, salt);
    return new Propose(channel, turnNum, balances, stake, preCommit);
  }

  stake: BN;
  preCommit: string;

  constructor(
    channel,
    turnNum: number,
    balances: BN[],
    stake: BN,
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
