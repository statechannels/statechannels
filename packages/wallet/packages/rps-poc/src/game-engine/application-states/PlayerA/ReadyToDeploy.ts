import BasePlayerA from './Base';

export default class ReadyToDeploy extends BasePlayerA {
  transaction;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, transaction }) {
    super({ channel, stake, balances });
    this.transaction = transaction;
  }
}
