import * as actions from './actions';
import { SharedData } from '../../state';
import { ProtocolStateWithSharedData, ProtocolReducer } from '..';
import * as states from './states';
import {
  initialize as initializeA,
  fundingStrategyNegotiationReducer as playerAReducer,
} from './player-a/reducer';
import {
  initialize as initializeB,
  fundingStrategyNegotiationReducer as playerBReducer,
} from './player-b/reducer';
import * as playerAStates from './player-a/states';
import { isFirstPlayer } from '../reducer-helpers';
import { ProtocolLocator } from '../../../communication';

export function initialize({
  sharedData,
  channelId,
  processId,
  opponentAddress,
  ourAddress,
  protocolLocator,
}: {
  sharedData: SharedData;
  channelId: string;
  processId: string;
  opponentAddress: string;
  ourAddress: string;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.FundingStrategyNegotiationState> {
  if (isFirstPlayer(channelId, sharedData)) {
    return initializeA({
      sharedData,
      processId,
      channelId,
      ourAddress,
      opponentAddress,
      protocolLocator,
    });
  } else {
    return initializeB({
      sharedData,
      processId,
      channelId,
      ourAddress,
      opponentAddress,
      protocolLocator,
    });
  }
}

export const fundingStrategyNegotiationReducer: ProtocolReducer<
  states.FundingStrategyNegotiationState
> = (
  protocolState: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.FundingStrategyNegotiationAction,
): ProtocolStateWithSharedData<states.FundingStrategyNegotiationState> => {
  if (playerAStates.isFundingStrategyNegotiationState(protocolState)) {
    if (!actions.isPlayerAFundingStrategyNegotiationAction(action)) {
      return { protocolState, sharedData };
    }
    return playerAReducer(protocolState, sharedData, action);
  } else {
    if (!actions.isPlayerBFundingStrategyNegotiationAction(action)) {
      return { protocolState, sharedData };
    }
    return playerBReducer(protocolState, sharedData, action);
  }
};
