import * as actions from './actions';
import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as states from './states';
import { initialize as initializeA, fundingReducer as playerAReducer } from './player-a/reducer';
import { initialize as initializeB, fundingReducer as playerBReducer } from './player-b/reducer';
import { TwoPartyPlayerIndex } from '../../types';
import { unreachable } from '../../../utils/reducer-utils';
import { NewLedgerChannelAction } from '../new-ledger-channel/actions';
import * as playerAStates from './player-a/states';
import { getOpponentAddress, getOurAddress } from '../reducer-helpers';

export function initialize(
  sharedData: SharedData,
  channelId: string,
  processId: string,
  playerIndex: TwoPartyPlayerIndex,
): ProtocolStateWithSharedData<states.FundingState> {
  const opponentAddress = getOpponentAddress(channelId, sharedData);
  const ourAddress = getOurAddress(channelId, sharedData);
  switch (playerIndex) {
    case TwoPartyPlayerIndex.A:
      return initializeA(sharedData, processId, channelId, ourAddress, opponentAddress);
    case TwoPartyPlayerIndex.B:
      return initializeB(sharedData, processId, channelId, ourAddress, opponentAddress);
    default:
      return unreachable(playerIndex);
  }
}

export const fundingReducer: ProtocolReducer<states.FundingState> = (
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | NewLedgerChannelAction,
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
