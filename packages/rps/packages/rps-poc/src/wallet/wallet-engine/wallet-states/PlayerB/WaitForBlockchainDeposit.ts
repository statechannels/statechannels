import BasePlayerB from './Base';

export default class WaitForBlockchainDeploy extends BasePlayerB {
  adjudicator;
  readonly isReadyToSend = false;
  readonly isFunded = false;
  constructor(adjudicator) {
    super();
    this.adjudicator = adjudicator;
  }
}
