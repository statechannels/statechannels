import * as states from './state';
import * as actions from '../actions';

import { ReducerWithSideEffects, combineReducersWithSideEffects } from '../../utils/reducer-utils';

import { StateWithSideEffects } from '../utils';
import { bigNumberify } from 'ethers/utils';
import { createDepositTransaction } from '../../utils/transaction-generator';
import { directFundingStatusReducer } from './directFunding/reducer';
import { isfundingAction } from './actions';
import { WalletProcedure } from '../types';

export const fundingStateReducer = (
  state: states.FundingState,
  action: actions.WalletAction,
): StateWithSideEffects<states.FundingState> => {
  if (!isfundingAction(action)) {
    return { state };
  }

  switch (action.type) {
    case actions.internal.DIRECT_FUNDING_REQUESTED:
      const {
        safeToDepositLevel,
        totalFundingRequired,
        requiredDeposit,
        channelId,
        ourIndex,
      } = action;
      if (state.directFunding[channelId]) {
        return { state };
      }

      const alreadySafeToDeposit = bigNumberify(safeToDepositLevel).eq('0x');
      const alreadyFunded = bigNumberify(totalFundingRequired).eq('0x');

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
        ? {
            transactionRequest: createDepositTransaction(action.channelId, action.requiredDeposit),
            channelId,
            procedure: WalletProcedure.DirectFunding,
          }
        : undefined;

      return {
        state: {
          ...state,
          directFunding: {
            ...state.directFunding,
            [channelId]: stateConstructor({
              ...state,
              fundingType: states.DIRECT_FUNDING,
              channelFundingStatus,
              safeToDepositLevel,
              channelId,
              requestedTotalFunds: totalFundingRequired,
              requestedYourContribution: requiredDeposit,
              ourIndex,
            }),
          },
        },
        sideEffects: { transactionOutbox },
      };
    default:
      return combinedReducer(state, action);
  }
};

const directFunding: ReducerWithSideEffects<states.DirectFundingState> = (
  state,
  action: actions.funding.FundingAction,
) => {
  const fundingStatus = state[action.channelId];

  if (!fundingStatus) {
    return { state };
  }

  const { state: newFundingStatus, sideEffects } = directFundingStatusReducer(
    fundingStatus,
    action,
  );
  return { state: { ...state, [action.channelId]: newFundingStatus }, sideEffects };
};

const indirectFunding: ReducerWithSideEffects<states.IndirectFundingState> = (state, action) => {
  return { state };
};

const combinedReducer = combineReducersWithSideEffects({
  directFunding,
  indirectFunding,
});
