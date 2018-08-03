import BasePlayerA from './Base';

export default class WaitForBlockchainDeploy extends BasePlayerA {
  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
  }
}
