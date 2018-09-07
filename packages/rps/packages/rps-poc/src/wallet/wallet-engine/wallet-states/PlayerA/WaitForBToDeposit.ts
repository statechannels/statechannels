import BasePlayerA from './Base';

export default class WaitForBToDeposit extends BasePlayerA {
  adjudicator: string;
  readonly isReadyToSend = false;
  readonly isFunded = false;
  constructor(adjudicator: string) {
    super();
    this.adjudicator = adjudicator;
  }
}
