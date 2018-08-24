import BasePlayerA from './Base';

export default class WaitForFunding extends BasePlayerA {
  readonly isReadyForFunding = true;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances }) {
    super({ channel, stake, balances });
    
  }
}
