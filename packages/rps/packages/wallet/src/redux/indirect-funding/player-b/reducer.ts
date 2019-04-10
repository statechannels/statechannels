import * as walletStates from '../../state';
import * as states from './state';

import * as actions from '../../actions';

import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex } from '../../types';
import { channelID } from 'fmg-core/lib/channel';

import * as selectors from '../../selectors';
import {
  appChannelIsWaitingForFunding,
  receiveOpponentLedgerCommitment,
  safeToSendLedgerUpdate,
  createAndSendUpdateCommitment,
  ledgerChannelFundsAppChannel,
  confirmFundingForAppChannel,
  receiveLedgerCommitment,
} from '../reducer-helpers';

export function playerBReducer(
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized {
  if (!walletStates.indirectFundingOngoing(state)) {
    return state;
  }
  if (state.indirectFunding.player !== PlayerIndex.B) {
    return state;
  }

  switch (state.indirectFunding.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApproval(state, action);
    case states.WAIT_FOR_PRE_FUND_SETUP_0:
      return waitForPreFundSetup0(state, action);
    case states.WAIT_FOR_DIRECT_FUNDING:
      return state;
    case states.WAIT_FOR_POST_FUND_SETUP_0:
      return waitForPostFundSetup0(state, action);
    case states.WAIT_FOR_LEDGER_UPDATE_0:
      return waitForLedgerUpdate0(state, action);
    case states.WAIT_FOR_CONSENSUS:
      return waitForConsensus(state, action);
    default:
      return unreachable(state.indirectFunding);
  }
}

const waitForApproval = (
  state: walletStates.IndirectFundingOngoing,
  action: actions.indirectFunding.Action,
) => {
  switch (action.type) {
    case actions.indirectFunding.playerB.STRATEGY_PROPOSED:
      const { channelId } = action;
      return { ...state, indirectFunding: states.waitForPreFundSetup0({ channelId }) };
    default:
      return state;
  }
};

const waitForPreFundSetup0 = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
) => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(state);
      let newState = { ...state };
      const { commitment, signature } = action;

      newState = receiveOpponentLedgerCommitment(newState, commitment, signature);

      const ledgerChannelId = channelID(commitment.channel);
      if (appChannelIsWaitingForFunding(state, indirectFundingState.channelId)) {
        newState = startDirectFunding(newState, indirectFundingState.channelId, ledgerChannelId);
      }
      return newState;
    default:
      return state;
  }
};

const waitForPostFundSetup0 = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
) => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newState = { ...state };
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForPostFundSetup0;

      // The ledger channel is in the `FUNDING` stage, so we have to use the
      // `receiveLedgerCommitment` helper and not the `receiveOpponentLedgerCommitment`
      // helper
      // Note that the channelStateReducer currently sends the post fund setup message
      newState = receiveLedgerCommitment(newState, action);
      newState.indirectFunding = states.waitForLedgerUpdate0(indirectFundingState);

      return newState;
    default:
      return state;
  }
};

const waitForLedgerUpdate0 = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForLedgerUpdate0;

      let newState = receiveOpponentLedgerCommitment(state, action.commitment, action.signature);
      if (safeToSendLedgerUpdate(newState, indirectFundingState.ledgerId)) {
        newState = createAndSendUpdateCommitment(
          newState,
          indirectFundingState.channelId,
          indirectFundingState.ledgerId,
        );
        newState.indirectFunding = states.waitForConsensus(indirectFundingState);
      }
      return newState;
    default:
      return state;
  }
};
const waitForConsensus = (
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const indirectFundingState = selectors.getIndirectFundingState(
        state,
      ) as states.WaitForConsensus;

      let newState = receiveOpponentLedgerCommitment(state, action.commitment, action.signature);
      if (
        ledgerChannelFundsAppChannel(
          newState,
          indirectFundingState.channelId,
          indirectFundingState.ledgerId,
        )
      ) {
        newState = confirmFundingForAppChannel(newState, indirectFundingState.channelId);
      }
      return newState;
    default:
      return state;
  }
};

function startDirectFunding(state: walletStates.Initialized, channelId, ledgerId) {
  state.indirectFunding = states.waitForDirectFunding({ channelId, ledgerId });
  return state;
}
