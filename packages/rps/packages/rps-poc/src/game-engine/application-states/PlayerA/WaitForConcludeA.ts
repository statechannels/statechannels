import BasePlayerA from './Base';

export default class WaitForConcludeA extends BasePlayerA {
  adjudicator: any;
  message: Message;

  constructor(channel, balances, adjudicator, message) {
    super(channel, balances, adjudicator);
    this.adjudicator = adjudicator;
    this.message = message;
  }
}
