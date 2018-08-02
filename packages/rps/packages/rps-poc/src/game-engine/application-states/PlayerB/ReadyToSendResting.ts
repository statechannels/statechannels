import BasePlayerB from './BaseState';

export default class ReadyToSendResting extends BasePlayerB {
  constructor({
    channel,
    stake,
    balances,
    adjudicator,
    aPlay,
    bPlay,
    result,
    salt,
    signedRestingMessage,
  }) {
    super(channel, stake, balances, signedRestingMessage);
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.result = result; // win/lose/draw
    this.salt = salt;
    this.adjudicator = adjudicator;
  }
}
