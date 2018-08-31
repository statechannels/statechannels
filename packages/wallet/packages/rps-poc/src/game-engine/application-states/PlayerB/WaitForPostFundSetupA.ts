import BasePlayerB from './Base';

export default class WaitForPostFundSetupA extends BasePlayerB {
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
