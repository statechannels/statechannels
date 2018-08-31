import BasePlayerB from './Base';

export default class ReadyToDeposit extends BasePlayerB {
  transaction;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, transaction }) {
    super({ channel, stake, balances });
    this.transaction = transaction;
  }
}
