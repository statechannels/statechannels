import BasePlayerB from './Base';
import Message from '../../Message';

export default class ReadyToChooseBPlay extends BasePlayerB {
  message: Message;
  adjudicator: string;

  constructor(channel, stake, balances, adjudicator, message) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.message = message;
  }
}
