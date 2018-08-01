import { State } from 'fmg-core';
import { packRevealAttributes, Play } from '.';

export default class Reveal extends State {
  stake: number;
  preCommit: string;
  aPlay: Play;
  bPlay: Play;
  salt: string;

  constructor(
    channel,
    turnNum: number,
    balances: number[],
    stake: number,
    bPlay: Play,
    aPlay: Play,
    salt: string,
  ) {
    const stateType = State.StateTypes.GAME;
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
