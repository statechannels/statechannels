import BasePlayerA from './Base';
import { Position } from '../../positions';
import { Play, Result } from '../../positions';

export default class ReadyToSendReveal extends BasePlayerA {
  position: Position;
  aPlay: Play;
  bPlay: Play;
  result: Result;
  salt: string;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, aPlay, bPlay, result, salt, position }) {
    super({ channel, stake, balances });
    this.position = position;
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
  }
}
