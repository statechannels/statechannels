import PlayerABase from './Base';
import Move from '../../Move';

export default class ReadyToSendConcludeA extends PlayerABase {
  adjudicator: any;
  move: Move;
  readonly isReadyToSend = true;

  constructor({ channel, balances, adjudicator }) {
    super({ channel, balances, stake: 0});
    this.adjudicator = adjudicator;
  }
}
