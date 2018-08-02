import BasePlayerB from './BaseState';

export default class ReadyToChooseBPlay extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator, opponentMessage }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.opponentMessage = opponentMessage;
  }
}
