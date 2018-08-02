import BasePlayerB from './BaseState';

export default class WaitForReveal extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator, bPlay, signedAcceptMessage }) {
    super(channel, stake, balances, signedAcceptMessage);
    this.adjudicator = adjudicator;
    this.bPlay = bPlay;
  }
}
