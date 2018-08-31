import { Channel } from 'fmg-core';

import BasePlayerA from './Base';
import { Position } from '../../positions';

export default class ReadyToSendPreFundSetupA extends BasePlayerA {
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, position }:
    { channel: Channel, stake: number, balances: number[], position: Position }) {
    super({ channel, stake, balances });
    this.position = position;
  }

  toJSON() {
    return {
      ...this.commonAttributes,
      position: this.position,
    };
  }
}
