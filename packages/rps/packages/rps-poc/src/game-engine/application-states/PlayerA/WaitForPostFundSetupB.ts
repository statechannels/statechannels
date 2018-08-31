import BasePlayerA from './Base';
import { Position } from '../../positions';

export default class WaitForPostFundSetupB extends BasePlayerA {
  position: Position;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, position }) {
    super({ channel, stake, balances });
    this.position = position;
  }
}
