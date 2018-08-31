import BasePlayerB from './Base';

export default class ReadyToChooseBPlay extends BasePlayerB {
  turnNum: number;
  preCommit: string;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, turnNum, preCommit }) {
    super({ channel, stake, balances });
    this.turnNum = turnNum;
    this.preCommit = preCommit;
  }
}
