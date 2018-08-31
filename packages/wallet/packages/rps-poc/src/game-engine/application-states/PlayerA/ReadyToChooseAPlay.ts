import BasePlayerA from './Base';

export default class ReadyToChooseAPlay extends BasePlayerA {
  turnNum: number;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, turnNum }) {
    super({ channel, stake, balances });
    this.turnNum = turnNum;
  }
}
