import BaseState from '../Base';
import { Player } from '..';

export default class BasePlayerB extends BaseState {
  playerIndex = 1;
  readonly player = Player.PlayerB;

  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
