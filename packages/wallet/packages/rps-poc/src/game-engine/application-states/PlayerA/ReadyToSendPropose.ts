import BasePlayerA from './BaseState';

export default class ReadyToSendPropose extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, aPlay, salt, signedProposeMessage }) {
    super(channel, stake, balances, signedProposeMessage);
    this.aPlay = aPlay;
    this.salt = salt;
    this.adjudicator = adjudicator;
  }

  get shouldSendMessage() {
    return true;
  }
}
