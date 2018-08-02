import WaitForConclude from '../WaitForConclude';

import {PLAYER_INDEX} from './index';

export default class WaitForConcludeB extends WaitForConclude {
  constructor({
    channel,
    balances,
    adjudicator,
    signedConcludeMessage,
  }) {
    super(
      channel, balances, adjudicator, PLAYER_INDEX, signedConcludeMessage
 );
  }
}
