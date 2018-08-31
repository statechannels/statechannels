import BasePlayerA from './Base';
import { Position } from '../../positions';

export default class WaitForConcludeA extends BasePlayerA {
  position: Position;
  readonly isReadyToSend = false;

  constructor({ channel, balances, position }) {
    super({ channel, balances, stake: 0 });
    this.position = position;
  }
}
