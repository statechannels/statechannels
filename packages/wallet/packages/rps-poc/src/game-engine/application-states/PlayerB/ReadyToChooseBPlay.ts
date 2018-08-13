import BasePlayerB from './Base';

export default class ReadyToChooseBPlay extends BasePlayerB {
  adjudicator: string;
  turnNum: number;
  preCommit: string;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, adjudicator, turnNum, preCommit }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator;
    this.turnNum = turnNum;
    this.preCommit = preCommit;
  }
}
