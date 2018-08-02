import WaitForConclude from '../WaitForConclude';
import { PLAYER_INDEX } from './index';

export default class WaitForConcludeA extends WaitForConclude {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
  }) {
    super(
      channel, balances, adjudicator, PLAYER_INDEX, signedConcludeMessage,
 );
    this.adjudicator = adjudicator;
    this.message = signedConcludeMessage; // in case a resend is required
  }
}
