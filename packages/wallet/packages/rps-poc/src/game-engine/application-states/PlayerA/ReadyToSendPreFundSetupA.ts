import { Channel } from 'fmg-core';

import BasePlayerA from './Base';
import Move from '../../Move';

export default class ReadyToSendPreFundSetupA extends BasePlayerA {
  move: Move;

  constructor({ channel, stake, balances, move }:
    { channel: Channel, stake: number, balances: number[], move: Move }) {
    super({ channel, stake, balances });
    this.move = move;
  }

  toJSON() {
    return {
      ...this.commonAttributes,
      move: this.move,
    };
  }

  get shouldSendMove() {
    return true;
  }
}
