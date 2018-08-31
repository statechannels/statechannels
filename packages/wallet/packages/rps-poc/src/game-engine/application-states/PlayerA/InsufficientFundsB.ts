import BasePlayerA from './Base';

export default class InsufficientFundsB extends BasePlayerA {
  readonly isReadyToSend = false;

  constructor({ channel, balances }) {
    super({ channel, balances, stake: 0 });
  }
}
