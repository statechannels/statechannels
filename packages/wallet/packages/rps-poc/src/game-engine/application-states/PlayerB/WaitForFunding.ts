import BasePlayerB from './Base';

export default class WaitForFunding extends BasePlayerB {
  readonly isReadyToSend = false;
readonly isReadyForFunding = true;
  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
