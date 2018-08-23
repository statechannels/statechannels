import BasePlayerB from './Base';

export default class Funded extends BasePlayerB {
  readonly isReadyToSend = false;
  readonly isFunded = true;
  adjudicator: string;

  constructor({ adjudicator }) {
    super();
    this.adjudicator = adjudicator;
  }
}
