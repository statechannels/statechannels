import BasePlayerA from './Base';

export default class FundingFailed extends BasePlayerA {
  readonly isReadyToSend = false;
  readonly isFunded = false;
  message;
  constructor(message){
      super();
      this.message =message;
  }
}
