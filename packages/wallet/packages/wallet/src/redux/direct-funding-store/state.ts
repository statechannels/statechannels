export interface DirectFundingStore {
  [channelId: string]: states.DirectFundingState;
}

import * as states from '../protocols/direct-funding/state';

export { states };
