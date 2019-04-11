import * as states from './state';

import * as actions from '../../../actions';

import { unreachable } from '../../../../utils/reducer-utils';
import { channelID } from 'fmg-core/lib/channel';

import {
  appChannelIsWaitingForFunding,
  receiveOpponentLedgerCommitment,
  safeToSendLedgerUpdate,
  createAndSendUpdateCommitment,
  ledgerChannelFundsAppChannel,
  confirmFundingForChannel,
  receiveLedgerCommitment,
} from '../reducer-helpers';
import { ProtocolStateWithSharedData, SharedData } from '../../';

export function playerBReducer(
  protocolState: states.PlayerBState,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> {
  switch (protocolState.type) {
    case states.WAIT_FOR_APPROVAL:
      return waitForApproval(protocolState, sharedData, action);
    case states.WAIT_FOR_PRE_FUND_SETUP_0:
      return waitForPreFundSetup0(protocolState, sharedData, action);
    case states.WAIT_FOR_DIRECT_FUNDING:
      return { protocolState, sharedData };
    case states.WAIT_FOR_POST_FUND_SETUP_0:
      return waitForPostFundSetup0(protocolState, sharedData, action);
    case states.WAIT_FOR_LEDGER_UPDATE_0:
      return waitForLedgerUpdate0(protocolState, sharedData, action);
    case states.WAIT_FOR_CONSENSUS:
      return waitForConsensus(protocolState, sharedData, action);
    default:
      return unreachable(protocolState);
  }
}

const waitForApproval = (
  protocolState: states.WaitForApproval,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.indirectFunding.playerB.STRATEGY_PROPOSED:
      return { protocolState: states.waitForPreFundSetup0(protocolState), sharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForPreFundSetup0 = (
  protocolState: states.WaitForPreFundSetup0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      const newSharedData = receiveOpponentLedgerCommitment(sharedData, commitment, signature);
      const ledgerId = channelID(commitment.channel);
      if (appChannelIsWaitingForFunding(newSharedData, protocolState.channelId)) {
        // TODO: start direct funding
      }
      const newProtocolState = states.waitForDirectFunding({ ...protocolState, ledgerId });
      return { protocolState: newProtocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForPostFundSetup0 = (
  protocolState: states.WaitForPostFundSetup0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      // The ledger channel is in the `FUNDING` stage, so we have to use the
      // `receiveLedgerCommitment` helper and not the `receiveOpponentLedgerCommitment`
      // helper
      // Note that the channelStateReducer currently sends the post fund setup message
      const newSharedData = receiveLedgerCommitment(sharedData, action);
      const newProtocolState = states.waitForLedgerUpdate0(protocolState);
      return { protocolState: newProtocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};

const waitForLedgerUpdate0 = (
  protocolState: states.WaitForLedgerUpdate0,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );
      if (safeToSendLedgerUpdate(newSharedData, protocolState.ledgerId)) {
        newSharedData = createAndSendUpdateCommitment(
          newSharedData,
          protocolState.channelId,
          protocolState.ledgerId,
        );
        const newProtocolState = states.waitForConsensus(protocolState);
        return { protocolState: newProtocolState, sharedData: newSharedData };
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};
const waitForConsensus = (
  protocolState: states.WaitForConsensus,
  sharedData: SharedData,
  action: actions.indirectFunding.Action,
): ProtocolStateWithSharedData<states.PlayerBState> => {
  switch (action.type) {
    case actions.COMMITMENT_RECEIVED:
      let newSharedData = receiveOpponentLedgerCommitment(
        sharedData,
        action.commitment,
        action.signature,
      );
      if (
        ledgerChannelFundsAppChannel(newSharedData, protocolState.channelId, protocolState.ledgerId)
      ) {
        newSharedData = confirmFundingForChannel(newSharedData, protocolState.channelId);
      }
      return { protocolState, sharedData: newSharedData };
    default:
      return { protocolState, sharedData };
  }
};
