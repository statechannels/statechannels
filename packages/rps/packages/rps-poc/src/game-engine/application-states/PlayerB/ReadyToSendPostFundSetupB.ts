import BasePlayerB from './Base';
import Move from '../../Move';

export default class ReadyToSendPostFundSetupB extends BasePlayerB {
  adjudicator: string;
  move: Move;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, adjudicator, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.adjudicator = adjudicator;
  }
}
