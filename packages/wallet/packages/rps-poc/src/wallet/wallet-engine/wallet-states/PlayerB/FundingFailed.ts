import BasePlayerB from './Base';

export default class FundingFailed extends BasePlayerB {
  readonly isReadyToSend = false;
  readonly isFunded = false;
  message;
  constructor(message){
      super();
      this.message =message;
  }
}
