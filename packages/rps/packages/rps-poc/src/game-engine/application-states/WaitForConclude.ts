import Message from '../Message';
import BaseState from './ApplicationStates';

export default class WaitForConclude extends BaseState {
  adjudicator: any;
  message: Message;

  constructor(
    channel,
    balances,
    adjudicator,
    playerIndex,
    signedConcludeMessage,
 ) {
    let stake;
    super(
      channel, stake, balances, playerIndex, signedConcludeMessage
 );
    this.adjudicator = adjudicator;
  }
}