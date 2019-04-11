import * as indirectFundingState from './state';
import * as actions from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { PlayerIndex } from '../types';
import { ProtocolStateWithSharedData, ProtocolReducer, SharedData } from '../protocols';
import { playerAReducer } from './player-a/reducer';
import { playerBReducer } from './player-b/reducer';

export const indirectFundingReducer: ProtocolReducer<indirectFundingState.IndirectFundingState> = (
  protocolState: indirectFundingState.IndirectFundingState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<indirectFundingState.IndirectFundingState> => {
  if (action.type === actions.indirectFunding.FUNDING_REQUESTED) {
    return fundingRequestedReducer(protocolState, sharedData, action);
  }
  switch (protocolState.player) {
    case PlayerIndex.A:
      return playerAReducer(protocolState, sharedData, action);
    case PlayerIndex.B:
      return playerBReducer(protocolState, sharedData, action);

    default:
      return unreachable(protocolState);
  }
};

function fundingRequestedReducer(
  protocolState: indirectFundingState.IndirectFundingState,
  sharedData: SharedData,
  action: actions.indirectFunding.FundingRequested,
): ProtocolStateWithSharedData<indirectFundingState.IndirectFundingState> {
  const { channelId, playerIndex: player } = action;
  switch (player) {
    case PlayerIndex.A:
      return {
        sharedData,
        protocolState: indirectFundingState.playerA.waitForApproval({ channelId, player }),
      };
    case PlayerIndex.B:
      return {
        sharedData,
        protocolState: indirectFundingState.playerB.waitForApproval({ channelId, player }),
      };
    default:
      return unreachable(player);
  }
}
