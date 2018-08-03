import BaseState from '../Base';
import { types } from '.';

export default class BasePlayerB extends BaseState {
  playerIndex = 1;

  constructor(channel, stake, balances) {
    super(channel, stake, balances);
  }

  get type() {
    return types[this.constructor.name];
  }
}
