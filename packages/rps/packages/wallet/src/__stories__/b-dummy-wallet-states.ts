import { IndirectFundingState } from 'src/redux/protocols/indirect-funding/state';
import * as fundingStates from '../redux/channel-state/funding/state';
import * as sharedStates from '../redux/channel-state/shared/state';
import * as channelStates from '../redux/channel-state/state';
import * as indirectFundingPlayerB from '../redux/protocols/indirect-funding/player-b/state';
import { emptyDisplayOutboxState } from '../redux/outbox/state';
import * as walletStates from '../redux/state';
import {
  bsAddress,
  bsPrivateKey,
  ledgerDirectFundingStates,
} from '../redux/__tests__/test-scenarios';
import { defaultParams } from './dummy-wallet-states';

const { channelId } = defaultParams;

export const playerBDefaults = {
  ...defaultParams,
  ourIndex: 1,
  address: bsAddress,
  privateKey: bsPrivateKey,
  directFundingState: ledgerDirectFundingStates.playerB,
};

/////////////////////
// CHANNEL STATES  //
/////////////////////

const defaultChannelOpen: sharedStates.ChannelOpen = {
  ...defaultParams,
  address: bsAddress,
  privateKey: bsPrivateKey,
  ourIndex: 1,
  channelNonce: 0,
  turnNum: 1,
};

const defaultChannelStatus: channelStates.ChannelStatus = fundingStates.waitForFundingAndPostFundSetup(
  {
    ...defaultChannelOpen,
  },
);

const defaultInitializedChannelState: channelStates.InitializedChannelState = {
  channelId: defaultChannelStatus,
};

const defaultChannelState: channelStates.ChannelState = {
  initializingChannels: {},
  initializedChannels: defaultInitializedChannelState,
};

const defaultInitialized: walletStates.Initialized = walletStates.initialized({
  ...defaultParams,
  channelState: defaultChannelState,
  outboxState: emptyDisplayOutboxState(),
  consensusLibrary: '',
  processStore: {},
  directFundingStore: {},
});

////////////////////////////////////////////////
// WALLET STATES FOR INDIRECT FUNDING PROCESS //
////////////////////////////////////////////////

const ledgerId = '0xLedger';
const waitForApprovalState = indirectFundingPlayerB.waitForApproval({ channelId });
const waitForPreFundSetup1State = indirectFundingPlayerB.waitForPreFundSetup0({
  channelId,
  ledgerId,
});
const waitForDirectFundingState = indirectFundingPlayerB.waitForDirectFunding({
  channelId,
  ledgerId,
  directFundingState: playerBDefaults.directFundingState,
});
const waitForPostFundSetup1State = indirectFundingPlayerB.waitForPostFundSetup0({
  channelId,
  ledgerId,
});
const waitForLedgerUpdate1State = indirectFundingPlayerB.waitForLedgerUpdate0({
  channelId,
  ledgerId,
});
const waitForConsensusState = indirectFundingPlayerB.waitForConsensus({
  channelId,
  ledgerId,
});

export const indirectFundingWalletState = (
  indirectFundingStateType: string,
): walletStates.Initialized => {
  let indirectFunding: IndirectFundingState;
  switch (indirectFundingStateType) {
    case indirectFundingPlayerB.WAIT_FOR_APPROVAL:
      indirectFunding = waitForApprovalState;
      break;
    case indirectFundingPlayerB.WAIT_FOR_PRE_FUND_SETUP_0:
      indirectFunding = waitForPreFundSetup1State;
      break;
    case indirectFundingPlayerB.WAIT_FOR_DIRECT_FUNDING:
      indirectFunding = waitForDirectFundingState;
      break;
    case indirectFundingPlayerB.WAIT_FOR_POST_FUND_SETUP_0:
      indirectFunding = waitForPostFundSetup1State;
      break;
    case indirectFundingPlayerB.WAIT_FOR_LEDGER_UPDATE_0:
      indirectFunding = waitForLedgerUpdate1State;
      break;
    case indirectFundingPlayerB.WAIT_FOR_CONSENSUS:
      indirectFunding = waitForConsensusState;
      break;
    default:
      indirectFunding = waitForLedgerUpdate1State;
  }

  // TODO: what channel state must match the indirect funding state?
  return {
    ...defaultInitialized,
    indirectFunding,
  };
};
