import BasePlayerB from './Base';
import { Position } from '../../positions';

export default class ReadyToSendConcludeB extends BasePlayerB {
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, balances, position }) {
    super({ channel, balances, stake: 0 });
    this.position = position;
  }
}
