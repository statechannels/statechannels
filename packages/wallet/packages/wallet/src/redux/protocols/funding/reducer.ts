import * as actions from './actions';
import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as states from './states';
import { initialize as initializeA, fundingReducer as playerAReducer } from './player-a/reducer';
import { initialize as initializeB, fundingReducer as playerBReducer } from './player-b/reducer';
import { TwoPartyPlayerIndex } from '../../types';
import { unreachable } from '../../../utils/reducer-utils';
import { IndirectFundingAction } from '../indirect-funding/actions';
import * as playerAStates from './player-a/states';
import * as selectors from '../../selectors';
import { getOpponentAddress } from '../reducer-helpers';

export function initialize(
  sharedData: SharedData,
  channelId: string,
  processId: string,
  playerIndex: TwoPartyPlayerIndex,
): ProtocolStateWithSharedData<states.FundingState> {
  const channelState = selectors.getChannelState(sharedData, channelId);
  const opponentAddress = getOpponentAddress(channelState, playerIndex);
  switch (playerIndex) {
    case TwoPartyPlayerIndex.A:
      return initializeA(sharedData, processId, channelId, opponentAddress);
    case TwoPartyPlayerIndex.B:
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
