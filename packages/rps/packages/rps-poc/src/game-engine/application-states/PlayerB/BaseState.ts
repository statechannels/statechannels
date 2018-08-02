import BaseState from '../ApplicationStates';
import { PLAYER_INDEX, types } from './index';

export default class BasePlayerB extends BaseState {
  constructor(channel, stake, balances, message=undefined) {
    super(channel, stake, balances, PLAYER_INDEX, message);
  }

  get type() {
    return types[this.constructor.name];
  }
}
