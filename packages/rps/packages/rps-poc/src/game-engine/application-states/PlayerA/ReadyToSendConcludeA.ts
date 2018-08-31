import PlayerABase from './Base';
import { Position } from '../../positions';

export default class ReadyToSendConcludeA extends PlayerABase {
  position: Position;
  readonly isReadyToSend = true;

  constructor({ channel, balances }) {
    super({ channel, balances, stake: 0});
  }
}
