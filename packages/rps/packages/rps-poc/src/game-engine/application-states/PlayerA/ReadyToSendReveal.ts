import BasePlayerA from './BaseState';

export default class ReadyToSendReveal extends BasePlayerA {
  constructor({
    channel,
    stake,
    balances,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRevealMessage,
  }) {
    super(channel, stake, balances, signedRevealMessage);
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
  }

  get shouldSendMessage() {
    return true;
  }
}
