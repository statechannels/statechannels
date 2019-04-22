import { FundingAction as PlayerAFundingAction } from './player-a/actions';
import { FundingAction as PlayerBFundingAction } from './player-b/actions';

import * as playerA from './player-a/states';
import * as playerB from './player-b/states';

export type FundingAction = PlayerAFundingAction | PlayerBFundingAction;

export { playerA, playerB };
