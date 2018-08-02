import Message from '../Message';
import BaseState from './ApplicationStates';

export default class ReadyToSendConclude extends BaseState {
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
      super(channel, stake, balances, playerIndex);
      this.adjudicator = adjudicator;
      this.message = signedConcludeMessage;
    }
  }
  