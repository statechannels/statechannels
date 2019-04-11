import * as states from './state';
import * as actions from '../../actions';
import * as depositingStates from './depositing/state';

import { unreachable } from '../../../utils/reducer-utils';
import { depositingReducer } from './depositing/reducer';
import { bigNumberify } from 'ethers/utils';
import { createDepositTransaction } from '../../../utils/transaction-generator';
import { WalletProcedure } from '../../types';
import { ProtocolReducer, ProtocolStateWithSharedData, SharedData } from '../../protocols';
import { accumulateSideEffects } from '../../outbox';

type DFReducer = ProtocolReducer<states.DirectFundingState>;

export const directFundingStateReducer: DFReducer = (
  state: states.DirectFundingState,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === actions.FUNDING_RECEIVED_EVENT && action.channelId === state.channelId) {
    // You can always move to CHANNEL_FUNDED based on the action
    // of some arbitrary actor, so this behaviour is common regardless of the stage of
    // the state
    if (bigNumberify(action.totalForDestination).gte(state.requestedTotalFunds)) {
      return {
        protocolState: states.channelFunded(state),
        sharedData,
      };
    }
  }

  if (states.stateIsNotSafeToDeposit(state)) {
    return notSafeToDepositReducer(state, sharedData, action);
  }
  if (states.stateIsDepositing(state)) {
    return depositingReducer(state, sharedData, action);
  }
  if (states.stateIsWaitForFundingConfirmation(state)) {
    return waitForFundingConfirmationReducer(state, sharedData, action);
  }
  if (states.stateIsChannelFunded(state)) {
    return channelFundedReducer(state, sharedData, action);
  }
  return unreachable(state);
};

const notSafeToDepositReducer: DFReducer = (
  state: states.NotSafeToDeposit,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      if (
        action.channelId === state.channelId &&
        bigNumberify(action.totalForDestination).gte(state.safeToDepositLevel)
      ) {
        const sideEffects = {
          // TODO: This will be factored out as channel reducers should not be sending transactions itself
          transactionOutbox: {
            transactionRequest: createDepositTransaction(
              state.channelId,
              state.requestedYourContribution,
            ),
            channelId: action.channelId,
            procedure: WalletProcedure.DirectFunding,
          },
        };
        return {
          protocolState: depositingStates.waitForTransactionSent({ ...state }),
          sharedData: {
            ...sharedData,
            outboxState: accumulateSideEffects(sharedData.outboxState, sideEffects),
          },
        };
      } else {
        return { protocolState: state, sharedData };
      }
    default:
      return { protocolState: state, sharedData };
  }
};
const waitForFundingConfirmationReducer: DFReducer = (
  state: states.WaitForFundingConfirmation,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  // TODO: This code path is unreachable, but the compiler doesn't know that.
  // Can we fix that?
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      if (
        action.channelId === state.channelId &&
        bigNumberify(action.totalForDestination).gte(state.requestedTotalFunds)
      ) {
        return {
          protocolState: states.channelFunded(state),
          sharedData,
        };
      } else {
        return { protocolState: state, sharedData };
      }
    default:
      return { protocolState: state, sharedData };
  }
};
const channelFundedReducer: DFReducer = (
  state: states.ChannelFunded,
  sharedData: SharedData,
  action: actions.WalletAction,
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  if (action.type === actions.FUNDING_RECEIVED_EVENT) {
    if (bigNumberify(action.totalForDestination).lt(state.requestedTotalFunds)) {
      // TODO: Deal with chain re-orgs that de-fund the channel here
      return { protocolState: state, sharedData };
    }
  }
  return { protocolState: state, sharedData };
};
