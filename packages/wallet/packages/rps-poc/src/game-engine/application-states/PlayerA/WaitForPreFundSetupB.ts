import BasePlayerA from './Base';
import Move from '../../Move';

export default class WaitForPreFundSetupB extends BasePlayerA {
  move: Move;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, move }) {
    super({ channel, stake, balances });
    this.move = move; // in case a resend is required
  }
}
