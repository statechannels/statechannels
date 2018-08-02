import BasePlayerB from './BaseState';

export default class WaitForBlockchainDeposit extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator }) {
    super(channel, stake, balances); 
    this.adjudicator = adjudicator; // address of adjudicator
  }
}
