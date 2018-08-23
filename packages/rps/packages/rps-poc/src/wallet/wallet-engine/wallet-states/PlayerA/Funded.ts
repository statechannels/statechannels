import BasePlayerA from './Base';

export default class Funded extends BasePlayerA {
  readonly isReadyToSend = false;
  readonly isFunded = true;
  adjudicator: string;

  constructor({ adjudicator }) {
    super();
    this.adjudicator = adjudicator;
  }
}
