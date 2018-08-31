import BasePlayerA from './Base';
import { Position } from '../../positions';

export default class ReadyToSendPostFundSetupA extends BasePlayerA {
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, position }) {
    super({ channel, stake, balances });
    this.position = position;
  }
}
