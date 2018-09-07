import BasePlayerB from './Base';

export default class ReadyToDeposit extends BasePlayerB {
  adjudicator;
  readonly isReadyToSend = true;
  readonly isFunded = false;
  constructor(adjudicator) {
    super();
    this.adjudicator = adjudicator;
  }
}
