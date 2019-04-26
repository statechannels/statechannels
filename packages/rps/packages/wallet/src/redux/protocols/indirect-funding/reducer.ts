import * as indirectFundingState from './state';
import * as actions from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex } from '../../types';
import { ProtocolStateWithSharedData, ProtocolReducer } from '../';
import { initialize as initializeA } from './player-a/reducer';
import { initialize as initializeB } from './player-b/reducer';
import { SharedData } from '../../state';

export function initialize(
  channelId: string,
  playerIndex: PlayerIndex,
  sharedData: SharedData,
): ProtocolStateWithSharedData<
  indirectFundingState.playerA.WaitForApproval | indirectFundingState.playerB.WaitForApproval
> {
  switch (playerIndex) {
    case PlayerIndex.A:
      return initializeA(channelId, sharedData);
    case PlayerIndex.B:
      return initializeB(channelId, sharedData);
    default:
      return unreachable(playerIndex);
  }
}

export const indirectFundingReducer: ProtocolReducer<indirectFundingState.IndirectFundingState> = (
  protocolState: indirectFundingState.IndirectFundingState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<indirectFundingState.IndirectFundingState> => {
  return { protocolState, sharedData };
};
