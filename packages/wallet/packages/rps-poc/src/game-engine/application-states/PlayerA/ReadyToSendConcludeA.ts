import PlayerABase from './Base';
import Message from '../../Message';

export default class ReadyToSendConcludeA extends PlayerABase {
  adjudicator: any;
  message: Message;

  constructor(channel, balances, adjudicator) {
    const stake = 0; // fake this until we fix the inheritance structure
    super(channel, balances, stake);
    this.adjudicator = adjudicator;
  }
}
