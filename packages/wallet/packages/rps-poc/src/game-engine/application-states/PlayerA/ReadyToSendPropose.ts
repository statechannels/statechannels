import BasePlayerA from './Base';
import { Play } from '../../positions';
import { Position } from '../../positions';

export default class ReadyToSendPropose extends BasePlayerA {
  aPlay: Play;
  salt: string;
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, aPlay, salt, position }) {
    super({ channel, stake, balances });
    this.aPlay = aPlay;
    this.salt = salt;
    this.position = position;
  }
}
