import * as states from './state';
import * as actions from '../actions';

import { unreachable, ReducerWithSideEffects } from '../../utils/reducer-utils';

import { StateWithSideEffects } from '../shared/state';
import { directFundingStateReducer } from './directFunding/reducer';
import { bigNumberify } from 'ethers/utils';
import { createDepositTransaction } from '../../utils/transaction-generator';

type ReturnType = StateWithSideEffects<states.FundingState>;

export const fundingStateReducer: ReducerWithSideEffects<states.FundingState> = (
  state: states.FundingState = states.waitForFundingRequest(),
  action: actions.WalletAction,
): ReturnType => {
  switch (state.fundingType) {
    //
    case states.UNKNOWN_FUNDING_TYPE:
      return unknownFundingTypeReducer(state, action);
    case states.DIRECT_FUNDING:
      return directFundingStateReducer(state, action);
    default:
      return unreachable(state);
  }
};

const unknownFundingTypeReducer = (
  state: states.WaitForFundingRequest,
  action: actions.WalletAction,
): ReturnType => {
  switch (action.type) {
    case actions.FUNDING_RECEIVED_EVENT:
      return {
        state: states.waitForFundingRequest(action),
      };
    case actions.internal.DIRECT_FUNDING_REQUESTED:
      const {
        safeToDepositLevel,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
      } = action;

      const alreadySafeToDeposit =
        bigNumberify(safeToDepositLevel).eq('0x') ||
        (state.destination === action.channelId &&
          bigNumberify(action.safeToDepositLevel).lte(state.totalForDestination!));
      const alreadyFunded =
        bigNumberify(totalFundingRequired).eq('0x') ||
        (state.destination === action.channelId &&
          bigNumberify(action.totalFundingRequired).lte(state.totalForDestination!));

      const channelFundingStatus = alreadyFunded
        ? states.CHANNEL_FUNDED
        : alreadySafeToDeposit
        ? states.SAFE_TO_DEPOSIT
        : states.NOT_SAFE_TO_DEPOSIT;

      const stateConstructor: any = alreadyFunded
        ? states.channelFunded
        : alreadySafeToDeposit
        ? states.depositing.waitForTransactionSent
        : states.notSafeToDeposit;

      const transactionOutbox = alreadySafeToDeposit
        ? createDepositTransaction(action.channelId, action.requiredDeposit)
        : undefined;

      return {
        state: stateConstructor({
          ...state,
          fundingType: states.DIRECT_FUNDING, // TODO: This should come from the action
          channelFundingStatus,
          safeToDepositLevel,
          channelId,
          requestedTotalFunds: totalFundingRequired,
          requestedYourContribution: requiredDeposit,
          ourIndex,
        }),
        outboxState: { transactionOutbox },
      };
    default:
      return { state };
  }
};
