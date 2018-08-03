import BasePlayerA from './Base';
import Message from '../../Message';

export default class ReadyToChooseAPlay extends BasePlayerA {
  adjudicator: string; // address
  opponentMessage: Message;

  constructor(channel, stake, balances, adjudicator, opponentMessage) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.opponentMessage = opponentMessage;
  }
}
