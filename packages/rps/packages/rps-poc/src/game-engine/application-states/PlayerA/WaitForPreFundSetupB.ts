import BasePlayerA from './Base';
import { Position } from '../../positions';

export default class WaitForPreFundSetupB extends BasePlayerA {
  position: Position;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, position }) {
    super({ channel, stake, balances });
    this.position = position; // in case a resend is required
  }
}
