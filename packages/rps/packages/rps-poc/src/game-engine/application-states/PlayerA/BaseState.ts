import BaseState from '../ApplicationStates';
import { PLAYER_INDEX, types } from './index';

export default class BasePlayerA extends BaseState {
  constructor(channel, stake, balances, message=undefined) {
    super(channel, stake, balances, PLAYER_INDEX, message);
  }

  get type() {
    types;
    return types[this.constructor.name];
  }
}
