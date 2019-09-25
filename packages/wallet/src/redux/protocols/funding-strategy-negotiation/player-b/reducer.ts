import * as states from './states';
import * as actions from './actions';

import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import { showWallet } from '../../reducer-helpers';
import { ProtocolLocator, sendStrategyApproved } from '../../../../communication';

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
    protocolState: states.waitForStrategyProposal({
      processId,
      targetChannelId: channelId,
      ourAddress,
      opponentAddress,
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
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.STRATEGY_PROPOSED':
      return strategyProposed(state, sharedData, action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData, action);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData);
    case 'WALLET.FUNDING_STRATEGY_NEGOTIATION.PLAYER_B.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function strategyProposed(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.StrategyProposed,
) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerB.WaitForStrategyProposal') {
    return { protocolState: state, sharedData };
  }

  const { strategy } = action;
  return { protocolState: states.waitForStrategyApproval({ ...state, strategy }), sharedData };
}

function strategyApproved(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  const { strategy } = action;
  const message = sendStrategyApproved(state.opponentAddress, state.processId, strategy);

  return {
    protocolState: states.success({ selectedFundingStrategy: strategy }),
    sharedData: queueMessage(sharedData, message),
  };
}

function strategyRejected(state: states.FundingStrategyNegotiationState, sharedData: SharedData) {
  if (state.type !== 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval') {
    return { protocolState: state, sharedData };
  }

  return {
    protocolState: states.waitForStrategyProposal({ ...state }),
    sharedData,
  };
}

function cancelled(
  state: states.FundingStrategyNegotiationState,
  sharedData: SharedData,
  action: actions.Cancelled,
) {
  if (
    state.type !== 'FundingStrategyNegotiation.PlayerB.WaitForStrategyProposal' &&
    state.type !== 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval'
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case TwoPartyPlayerIndex.A: {
      return {
        protocolState: states.failure({ reason: 'Opponent refused' }),
        sharedData,
      };
    }
    case TwoPartyPlayerIndex.B: {
      return {
        protocolState: states.failure({ reason: 'User refused' }),
        sharedData,
      };
    }
    default:
      return unreachable(action.by);
  }
}
