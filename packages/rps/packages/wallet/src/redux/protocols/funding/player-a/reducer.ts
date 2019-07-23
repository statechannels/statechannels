import * as states from './states';
import * as actions from './actions';
import * as helpers from '../../reducer-helpers';

import { SharedData, queueMessage } from '../../../state';
import { ProtocolStateWithSharedData, makeLocator, EMPTY_LOCATOR } from '../..';
import { unreachable } from '../../../../utils/reducer-utils';
import { TwoPartyPlayerIndex } from '../../../types';
import {
  showWallet,
  hideWallet,
  sendFundingComplete,
  getLatestCommitment,
} from '../../reducer-helpers';
import { fundingFailure } from 'magmo-wallet-client';
import { sendStrategyProposed, EmbeddedProtocol } from '../../../../communication';

import * as indirectFundingStates from '../../indirect-funding/states';
import {
  indirectFundingReducer,
  initializeIndirectFunding,
  IndirectFundingAction,
} from '../../indirect-funding';
import * as virtualFunding from '../../virtual-funding';
import {
  AdvanceChannelAction,
  advanceChannelReducer,
  initializeAdvanceChannel,
} from '../../advance-channel';
import * as advanceChannelStates from '../../advance-channel/states';
import { clearedToSend, routesToAdvanceChannel } from '../../advance-channel/actions';
import { CommitmentType } from '../../../../domain';
import { ADVANCE_CHANNEL_PROTOCOL_LOCATOR } from '../../advance-channel/reducer';
import { routesToIndirectFunding } from '../../indirect-funding/actions';
import { routesToVirtualFunding } from '../../virtual-funding/actions';

type EmbeddedAction = IndirectFundingAction | AdvanceChannelAction;

export function initialize(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  ourAddress: string,
  opponentAddress: string,
): ProtocolStateWithSharedData<states.FundingState> {
  return {
    protocolState: states.waitForStrategyChoice({
      processId,
      targetChannelId: channelId,
      opponentAddress,
      ourAddress,
    }),
    sharedData: showWallet(sharedData),
  };
}

export function fundingReducer(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.FundingAction | EmbeddedAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (routesToAdvanceChannel(action, EMPTY_LOCATOR)) {
    return handleAdvanceChannelAction(state, sharedData, action);
  } else if (routesToIndirectFunding(action, EMPTY_LOCATOR)) {
    return handleIndirectFundingAction(state, sharedData, action);
  } else if (routesToVirtualFunding(action, EMPTY_LOCATOR)) {
    return handleVirtualFundingAction(state, sharedData, action);
  }

  switch (action.type) {
    case 'WALLET.FUNDING.PLAYER_A.STRATEGY_CHOSEN':
      return strategyChosen(state, sharedData, action);
    case 'WALLET.FUNDING.STRATEGY_APPROVED':
      return strategyApproved(state, sharedData, action);
    case 'WALLET.FUNDING.PLAYER_A.STRATEGY_REJECTED':
      return strategyRejected(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_A.FUNDING_SUCCESS_ACKNOWLEDGED':
      return fundingSuccessAcknowledged(state, sharedData);
    case 'WALLET.FUNDING.PLAYER_A.CANCELLED':
      return cancelled(state, sharedData, action);
    default:
      return unreachable(action);
  }
}

function handleAdvanceChannelAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: AdvanceChannelAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (
    protocolState.type !== 'Funding.PlayerA.WaitForPostFundSetup' &&
    protocolState.type !== 'Funding.PlayerA.WaitForIndirectFunding'
  ) {
    console.warn(
      `Funding reducer received advance channel action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }
  const result = advanceChannelReducer(protocolState.postFundSetupState, sharedData, action);
  if (!advanceChannelStates.isTerminal(result.protocolState)) {
    return {
      protocolState: { ...protocolState, postFundSetupState: result.protocolState },
      sharedData: result.sharedData,
    };
  } else if (result.protocolState.type === 'AdvanceChannel.Failure') {
    return {
      protocolState: states.failure({ reason: 'AdvanceChannelFailure' }),
      sharedData: result.sharedData,
    };
  } else {
    return {
      protocolState: states.waitForSuccessConfirmation(protocolState),
      sharedData: result.sharedData,
    };
  }
}

function handleIndirectFundingAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: IndirectFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (protocolState.type !== 'Funding.PlayerA.WaitForIndirectFunding') {
    console.warn(
      `Funding reducer received indirect funding action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }

  const {
    protocolState: updatedFundingState,
    sharedData: updatedSharedData,
  } = indirectFundingReducer(protocolState.fundingState, sharedData, action);

  if (!indirectFundingStates.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForIndirectFunding({
        ...protocolState,
        fundingState: updatedFundingState,
      }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}

function handleVirtualFundingAction(
  protocolState: states.FundingState,
  sharedData: SharedData,
  action: virtualFunding.VirtualFundingAction,
): ProtocolStateWithSharedData<states.FundingState> {
  if (protocolState.type !== 'Funding.PlayerA.WaitForVirtualFunding') {
    console.warn(
      `Funding reducer received indirect funding action ${action.type} but is currently in state ${
        protocolState.type
      }`,
    );
    return { protocolState, sharedData };
  }

  const {
    protocolState: updatedFundingState,
    sharedData: updatedSharedData,
  } = virtualFunding.virtualFundingReducer(protocolState.fundingState, sharedData, action);

  if (!virtualFunding.isTerminal(updatedFundingState)) {
    return {
      protocolState: states.waitForVirtualFunding({
        ...protocolState,
        fundingState: updatedFundingState,
      }),
      sharedData: updatedSharedData,
    };
  } else {
    return handleFundingComplete(protocolState, updatedFundingState, updatedSharedData);
  }
}

function strategyChosen(
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyChosen,
) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyChoice') {
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
  state: states.FundingState,
  sharedData: SharedData,
  action: actions.StrategyApproved,
) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }

  const { processId, targetChannelId, ourAddress } = state;
  let advanceChannelState: advanceChannelStates.AdvanceChannelState;
  ({ protocolState: advanceChannelState, sharedData } = initializeAdvanceChannel(sharedData, {
    channelId: targetChannelId,
    ourIndex: TwoPartyPlayerIndex.A,
    processId,
    commitmentType: CommitmentType.PostFundSetup,
    clearedToSend: false,
    protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
  }));

  switch (action.strategy) {
    case 'IndirectFundingStrategy': {
      const latestCommitment = getLatestCommitment(state.targetChannelId, sharedData);
      const { protocolState: fundingState, sharedData: newSharedData } = initializeIndirectFunding({
        processId: state.processId,
        channelId: state.targetChannelId,
        targetAllocation: latestCommitment.allocation,
        targetDestination: latestCommitment.destination,
        sharedData,
        protocolLocator: makeLocator(EmbeddedProtocol.IndirectFunding),
      });
      if (fundingState.type === 'IndirectFunding.Failure') {
        return {
          protocolState: states.failure(fundingState),
          sharedData: newSharedData,
        };
      }
      return {
        protocolState: states.waitForIndirectFunding({
          ...state,
          fundingState,
          postFundSetupState: advanceChannelState,
        }),
        sharedData,
      };
    }
    case 'VirtualFundingStrategy': {
      const {
        allocation: startingAllocation,
        destination: startingDestination,
        channel,
      } = helpers.getLatestCommitment(targetChannelId, sharedData);

      const ourIndex = channel.participants.indexOf(ourAddress);

      let fundingState: virtualFunding.VirtualFundingState;
      ({ protocolState: fundingState, sharedData } = virtualFunding.initializeVirtualFunding(
        sharedData,
        {
          processId,
          targetChannelId,
          ourIndex,
          // TODO: This should be an env variable
          hubAddress: '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C',
          startingAllocation,
          startingDestination,
          protocolLocator: makeLocator(EmbeddedProtocol.VirtualFunding),
        },
      ));

      return {
        protocolState: states.waitForVirtualFunding({
          ...state,
          fundingState,
          postFundSetupState: advanceChannelState,
        }),
        sharedData,
      };
    }
    default:
      return unreachable(action.strategy);
  }
}

function strategyRejected(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerA.WaitForStrategyResponse') {
    return { protocolState: state, sharedData };
  }
  return { protocolState: states.waitForStrategyChoice(state), sharedData };
}

function fundingSuccessAcknowledged(state: states.FundingState, sharedData: SharedData) {
  if (state.type !== 'Funding.PlayerA.WaitForSuccessConfirmation') {
    return { protocolState: state, sharedData };
  }
  const updatedSharedData = sendFundingComplete(sharedData, state.targetChannelId);
  return { protocolState: states.success({}), sharedData: hideWallet(updatedSharedData) };
}

function cancelled(state: states.FundingState, sharedData: SharedData, action: actions.Cancelled) {
  if (
    state.type !== 'Funding.PlayerA.WaitForStrategyChoice' &&
    state.type !== 'Funding.PlayerA.WaitForStrategyResponse'
  ) {
    return { protocolState: state, sharedData };
  }
  switch (action.by) {
    case TwoPartyPlayerIndex.A: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'User refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    case TwoPartyPlayerIndex.B: {
      const { targetChannelId } = state;
      const message = fundingFailure(targetChannelId, 'FundingDeclined');
      return {
        protocolState: states.failure({ reason: 'Opponent refused' }),
        sharedData: queueMessage(sharedData, message),
      };
    }
    default:
      return unreachable(action.by);
  }
}

function handleFundingComplete(
  protocolState: states.WaitForIndirectFunding | states.WaitForVirtualFunding,
  fundingState: indirectFundingStates.IndirectFundingState | virtualFunding.VirtualFundingState,
  sharedData: SharedData,
) {
  switch (fundingState.type) {
    case 'IndirectFunding.Success':
    case 'VirtualFunding.Success': {
      // When funding is complete we alert the advance channel protocol that we are now cleared to exchange post fund setups
      let postFundSetupState: advanceChannelStates.AdvanceChannelState;
      ({ protocolState: postFundSetupState, sharedData } = advanceChannelReducer(
        protocolState.postFundSetupState,
        sharedData,
        clearedToSend({
          processId: protocolState.processId,
          protocolLocator: ADVANCE_CHANNEL_PROTOCOL_LOCATOR,
        }),
      ));
      return {
        protocolState: states.waitForPostFundSetup({
          ...protocolState,
          postFundSetupState,
        }),
        sharedData,
      };
    }
    default:
      // TODO: Indirect/Virtual funding should return a proper error to pass to our failure state
      return {
        protocolState: states.failure({ reason: 'Indirect Funding Failure' }),
        sharedData,
      };
  }
}
