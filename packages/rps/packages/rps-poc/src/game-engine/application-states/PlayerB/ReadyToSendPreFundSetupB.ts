import BasePlayerB from './BaseState';

export default class ReadyToSendPreFundSetupB extends BasePlayerB {
  constructor({ channel, stake, balances, signedPreFundSetupBMessage }) {
    super(channel, stake, balances, signedPreFundSetupBMessage);
  }
}
