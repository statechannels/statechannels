import BaseState from '../Base';
import { types } from '.';

export default class BasePlayerA extends BaseState {
  playerIndex = 0;

  constructor(channel, stake, balances) {
    super(channel, stake, balances);
  }

  get type() {
    return types[this.constructor.name];
  }
}
