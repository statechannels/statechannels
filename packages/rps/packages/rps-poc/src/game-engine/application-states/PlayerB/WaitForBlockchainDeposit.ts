import BasePlayerB from './Base';

export default class WaitForBlockchainDeposit extends BasePlayerB {
  adjudicator: string;

  constructor(channel, stake, balances, adjudicator) {
    super(channel, stake, balances); 
    this.adjudicator = adjudicator; // address of adjudicator
  }
}
