import BasePlayerB from './Base';
import Message from '../../Message';

export default class ReadyToChooseBPlay extends BasePlayerB {
  adjudicator: string;

  constructor({ channel, stake, balances, adjudicator }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator;
  }
}
