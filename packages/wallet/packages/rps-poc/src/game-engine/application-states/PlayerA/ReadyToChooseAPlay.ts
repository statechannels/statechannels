import BasePlayerA from './Base';

export default class ReadyToChooseAPlay extends BasePlayerA {
  adjudicator: string; // address
  turnNum: number;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, adjudicator, turnNum }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator;
    this.turnNum = turnNum;
  }
}
