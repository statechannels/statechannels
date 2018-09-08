import { State } from 'fmg-core';
import { packRevealAttributes, Play } from '.';
import BN from 'bn.js';

export default class Reveal extends State {
  stake: BN;
  preCommit: string;
  aPlay: Play;
  bPlay: Play;
  salt: string;

  constructor(
    channel,
    turnNum: number,
    balances: BN[],
    stake: BN,
    bPlay: Play,
    aPlay: Play,
    salt: string,
  ) {
    const stateType = State.StateType.Game;
    super({ channel, stateType, turnNum, resolution: balances });
    this.stake = stake;
    this.bPlay = bPlay;
    this.aPlay = aPlay;
    this.salt = salt;
  }

  toHex() {
    return super.toHex() + packRevealAttributes(
      this.stake,
      this.bPlay,
      this.aPlay,
      this.salt
    );
  }
}
