import BasePlayerB from './Base';

export default class ReadyToDeposit extends BasePlayerB {
  transaction;
  adjudicator;
  readonly isReadyToSend = true;
  readonly isFunded = false;
  constructor({adjudicator, transaction }) {
    super();
    this.transaction = transaction;
    this.adjudicator = adjudicator;
  }
}
