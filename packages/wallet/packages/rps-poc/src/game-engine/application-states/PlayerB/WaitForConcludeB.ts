import BasePlayerB from './Base';
import { Position } from '../../positions';

export default class WaitForConcludeB extends BasePlayerB {
  position: Position;
  readonly isReadyToSend = false;

  constructor({ channel, balances, position }) {
    super({ channel, balances, stake: 0 });
    this.position = position;
  }
}
