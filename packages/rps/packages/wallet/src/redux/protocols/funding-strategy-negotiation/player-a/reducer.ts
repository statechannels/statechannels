import * as states from './states';
import * as actions from './actions';

import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import { showWallet } from '../../reducer-helpers';
import { sendStrategyProposed, ProtocolLocator } from '../../../../communication';

export function initialize({
  sharedData,
  processId,
  channelId,
  ourAddress,
  opponentAddress,
  protocolLocator,
}: {
  sharedData: SharedData;
  processId: string;
  channelId: string;
  ourAddress: string;
  opponentAddress: string;
  protocolLocator: ProtocolLocator;
}): ProtocolStateWithSharedData<states.FundingStrategyNegotiationState> {
  return {
    protocolState: states.waitForStrategyChoice({
      processId,
      targetChannelId: channelId,
      opponentAddress,
      ourAddress,
      protocolLocator,
    }),
    sharedData: showWallet(sharedData),
  };
}

export function fundingStrategyNegotiationReducer(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.FundingStrategyNegotiationAction,
): ProtocolStateWithSharedData<states.FundingStrategyNegotiationState> {
  switch (action.type) {
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_CHOSEN':
      return strategyChosen(state, sharedData, action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData, action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_A.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}
function strategyChosen(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.StrategyChosen,
) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice') {
    return { protocolState: state, sharedData };
  }
  const { processId, opponentAddress } = state;
  const { strategy } = action;

  const message = sendStrategyProposed(opponentAddress, processId, strategy);
  return {
    protocolState: states.waitForStrategyResponse({ ...state, strategy }),
    sharedData: queueMessage(sharedData, message),
  };
}

function strategyApproved(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }

  return {
    protocolState: states.success({ selectedFundingStrategy: action.strategy }),
    sharedData,
  };
}

function strategyRejected(state: states.FundingStrategyNegotiationState, sharedData: SharedData) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }
  return { protocolState: states.waitForStrategyChoice(state), sharedData };
}

function cancelled(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.Cancelled,
) {
  if (
    state.type !== 'FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice' &&
    state.type !== 'FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse'
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case TwoPartyPlayerIndex.A: {
      return {
        protocolState: states.failure({ reason: 'User refused' }),
        sharedData,
      };
    }
    case TwoPartyPlayerIndex.B: {
      return {
        protocolState: states.failure({ reason: 'Opponent refused' }),
        sharedData,
      };
    }
    default:
      return unreachable(action.by);
  }
}
