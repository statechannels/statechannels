import BasePlayerB from './Base';

export default class WaitForAToDeploy extends BasePlayerB {
  transaction;
  readonly isReadyToSend = false;
  readonly isFunded = false;
  constructor({ transaction }) {
    super();
    this.transaction = transaction;
  }
}
