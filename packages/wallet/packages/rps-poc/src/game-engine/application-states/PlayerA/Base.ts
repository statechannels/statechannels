import BaseState from '../Base';
import { Channel } from 'fmg-core';
import { types } from '.';

export default class BasePlayerA extends BaseState {
  playerIndex = 0;

  constructor(params: {channel: Channel, stake: number, balances: number[]}) {
    super(params);
  }

  get type() {
    return types[this.constructor.name];
  }
}
