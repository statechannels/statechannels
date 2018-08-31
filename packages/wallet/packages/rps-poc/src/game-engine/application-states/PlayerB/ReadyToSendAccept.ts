import BasePlayerB from './Base';
import { Position } from '../../positions';
import { Play } from '../../positions';

export default class ReadyToSendAccept extends BasePlayerB {
  position: Position;
  bPlay: Play;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, bPlay, position }) {
    super({ channel, stake, balances });
    this.position = position;
    this.bPlay = bPlay;
  }
}
