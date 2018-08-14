import BaseState from '../Base';
import { Channel } from 'fmg-core';
import { Player } from '..';

export default class BasePlayerA extends BaseState {
  playerIndex = 0;
  readonly player = Player.PlayerA;

  constructor(params: {channel: Channel, stake: number, balances: number[]}) {
    super(params);
  }
}
