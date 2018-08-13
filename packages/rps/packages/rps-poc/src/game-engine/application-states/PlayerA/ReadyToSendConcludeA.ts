import PlayerABase from './Base';
import Move from '../../Move';

export default class ReadyToSendConcludeA extends PlayerABase {
  adjudicator: any;
  move: Move;

  constructor({ channel, balances, adjudicator }) {
    const stake = 0; // fake this until we fix the inheritance structure
    super({ channel, balances, stake });
    this.adjudicator = adjudicator;
  }
}
