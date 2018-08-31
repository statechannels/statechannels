import BasePlayerB from './Base';
import { Position } from '../../positions';
import { Play } from '../../positions';

export default class WaitForReveal extends BasePlayerB {
  position: Position;
  bPlay: Play;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, bPlay, position }) {
    super({ channel, stake, balances });
    this.position = position;
    this.bPlay = bPlay;
  }
}
