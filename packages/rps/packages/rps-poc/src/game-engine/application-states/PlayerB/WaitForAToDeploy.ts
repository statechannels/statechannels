import BasePlayerB from './Base';

export default class WaitForAToDeploy extends BasePlayerB {
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
