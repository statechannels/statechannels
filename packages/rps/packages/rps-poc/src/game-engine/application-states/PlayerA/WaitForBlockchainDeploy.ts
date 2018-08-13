import BasePlayerA from './Base';

export default class WaitForBlockchainDeploy extends BasePlayerA {
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
