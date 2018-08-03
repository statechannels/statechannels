import BasePlayerB from './Base';
import Message from '../../Message';

export default class ReadyToSendPostFundSetupB extends BasePlayerB {
  adjudicator: string;
  message: Message;

  constructor({ channel, stake, balances, adjudicator, message }) {
    super({ channel, stake, balances });
    this.message = message;
    this.adjudicator = adjudicator;
  }
}
