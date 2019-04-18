import * as indirectFundingState from './state';
import * as actions from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex } from '../../types';
import { ProtocolStateWithSharedData, ProtocolReducer } from '../';
import { playerAReducer, initialize as initializeA } from './player-a/reducer';
import { playerBReducer, initialize as initializeB } from './player-b/reducer';
import { SharedData } from '../../state';

export function initialize(
  action: actions.indirectFunding.FundingRequested,
  sharedData: SharedData,
): ProtocolStateWithSharedData<
  indirectFundingState.playerA.WaitForApproval | indirectFundingState.playerB.WaitForApproval
> {
  const { playerIndex } = action;
  switch (playerIndex) {
    case PlayerIndex.A:
      return initializeA(action, sharedData);
    case PlayerIndex.B:
      return initializeB(action, sharedData);
    default:
      return unreachable(playerIndex);
  }
}

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
