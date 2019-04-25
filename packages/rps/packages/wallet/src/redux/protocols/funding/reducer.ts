import * as actions from './actions';
import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as states from './states';
import { initialize as initializeA, fundingReducer as playerAReducer } from './player-a/reducer';
import { initialize as initializeB, fundingReducer as playerBReducer } from './player-b/reducer';
import { PlayerIndex } from '../../types';
import { unreachable } from '../../../utils/reducer-utils';
import { Action as IndirectFundingAction } from '../indirect-funding/actions';
import * as playerAStates from './player-a/states';
import * as selectors from '../../selectors';

export function initialize(
  sharedData: SharedData,
  channelId: string,
  processId: string,
  playerIndex: PlayerIndex,
): ProtocolStateWithSharedData<states.FundingState> {
  // TODO: We probably want to handle this in the root reducer
  const channelState = selectors.getChannelState(sharedData, channelId);
  const opponentAddress = channelState.participants[playerIndex];
  switch (playerIndex) {
    case PlayerIndex.A:
      return initializeA(sharedData, processId, channelId, opponentAddress);
    case PlayerIndex.B:
      return initializeB(sharedData, processId, channelId, opponentAddress);
    default:
      return unreachable(playerIndex);
  }
}

export const fundingReducer: ProtocolReducer<states.FundingState> = (
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | IndirectFundingAction,
): ProtocolStateWithSharedData<states.FundingState> => {
  if (playerAStates.isFundingState(protocolState)) {
    if (!actions.isPlayerAFundingAction(action)) {
      return { protocolState, sharedData };
    }
    return playerAReducer(protocolState, sharedData, action);
  } else {
    if (!actions.isPlayerBFundingAction(action)) {
      return { protocolState, sharedData };
    }
    return playerBReducer(protocolState, sharedData, action);
  }
};
