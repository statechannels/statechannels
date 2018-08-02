import BasePlayerA from './BaseState';

export default class ReadyToDeploy extends BasePlayerA {
  constructor({ channel, stake, balances, deploymentTransaction }) {
    super(channel, stake, balances);
    this.transaction = deploymentTransaction;
  }
}
