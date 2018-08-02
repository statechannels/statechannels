import BasePlayerB from './BaseState';

export default class WaitForAToDeploy extends BasePlayerB {
  constructor({ channel, stake, balances }) {
    super(channel, stake, balances);
  }
}
