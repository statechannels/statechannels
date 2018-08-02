import ReadyToSendConclude from '../ReadyToSendConclude';
import { PLAYER_INDEX } from './index';

export default class ReadyToSendConcludeB extends ReadyToSendConclude {
  constructor({
    channel, balances, adjudicator, signedConcludeMessage,
  }) {
    super(
      channel, balances, adjudicator, PLAYER_INDEX, signedConcludeMessage
 );
  }
}
