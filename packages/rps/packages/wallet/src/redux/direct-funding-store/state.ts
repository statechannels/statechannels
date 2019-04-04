export interface DirectFundingStore {
  [channelId: string]: states.DirectFundingState;
}

import * as states from './direct-funding-state/state';

export { states };
