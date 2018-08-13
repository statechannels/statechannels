import BasePlayerA from './Base';
import Move from '../../Move';

export default class ReadyToSendPostFundSetupA extends BasePlayerA {
  adjudicator: string; // address
  move: Move;

  constructor({ channel, stake, balances, adjudicator, move }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator;
    this.move = move;
  }

  get shouldSendMove() {
    return true;
  }
}
