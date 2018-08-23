import BasePlayerA from './Base';

export default class ReadyToDeploy extends BasePlayerA {
  transaction;
  readonly isReadyToSend = true;
  readonly isFunded = false;
  constructor({ transaction }) {
    super();
    this.transaction = transaction;
  }
}
