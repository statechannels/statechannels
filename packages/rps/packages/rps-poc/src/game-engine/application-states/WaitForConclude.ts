import Message from '../Message';
import BaseState from './ApplicationStates';

export default class WaitForConclude extends BaseState {
  adjudicator: any;
  message: Message;

  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
    playerIndex,
  }) {
    super({
      channel, balances, playerIndex, stake: undefined
    });
    this.adjudicator = adjudicator;
    this.message = signedConcludeMessage;
  }
}