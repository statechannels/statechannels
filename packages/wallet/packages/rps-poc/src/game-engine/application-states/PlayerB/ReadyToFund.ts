import BasePlayerB from './Base';

export default class ReadyToFund extends BasePlayerB {
  readonly isReadyToSend = false;
readonly isReadyForFunding = true;
  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
