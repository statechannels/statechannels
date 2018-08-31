import BasePlayerB from './Base';
import { Position } from '../../positions';

export default class WaitForPropose extends BasePlayerB {
  position: Position;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, position }) {
    super({ channel, stake, balances });
    this.position = position;
  }
}
