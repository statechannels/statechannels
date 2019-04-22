import { FundingState as PlayerAFundingState } from './player-a/states';
import { FundingState as PlayerBFundingState } from './player-b/states';

import * as playerA from './player-a/states';
import * as playerB from './player-b/states';

export type FundingState = PlayerAFundingState | PlayerBFundingState;

export { playerA, playerB };
