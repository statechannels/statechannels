import { IndirectFundingState } from 'src/redux/indirect-funding/state';
import * as fundingStates from '../redux/channel-state/funding/state';
import * as sharedStates from '../redux/channel-state/shared/state';
import * as channelStates from '../redux/channel-state/state';
import * as indirectFundingPlayerA from '../redux/indirect-funding/player-a/state';
import { EMPTY_OUTBOX_STATE } from '../redux/outbox/state';
import * as walletStates from '../redux/state';
import { asAddress, asPrivateKey } from '../redux/__tests__/test-scenarios';
import { defaultParams } from './dummy-wallet-states';

const { channelId } = defaultParams;

export const playerADefaults = {
  ...defaultParams,
  ourIndex: 0,
  address: asAddress,
  privateKey: asPrivateKey,
};

/////////////////////
// CHANNEL STATES  //
/////////////////////

const defaultChannelOpen: sharedStates.ChannelOpen = {
  ...defaultParams,
  address: asAddress,
  privateKey: asPrivateKey,
  ourIndex: 0,
  channelNonce: 0,
  turnNum: 0,
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
  outboxState: EMPTY_OUTBOX_STATE,
  consensusLibrary: '',
  processStore: {},
  directFundingStore: {},
});

////////////////////////////////////////////////
// WALLET STATES FOR INDIRECT FUNDING PROCESS //
////////////////////////////////////////////////

const ledgerId = '0xLedger';
const waitForApprovalState = indirectFundingPlayerA.waitForApproval({ channelId });
const waitForPreFundSetup1State = indirectFundingPlayerA.waitForPreFundSetup1({
  channelId,
  ledgerId,
});
const waitForDirectFundingState = indirectFundingPlayerA.waitForDirectFunding({
  channelId,
  ledgerId,
});
const waitForPostFundSetup1State = indirectFundingPlayerA.waitForPostFundSetup1({
  channelId,
  ledgerId,
});
const waitForLedgerUpdate1State = indirectFundingPlayerA.waitForLedgerUpdate1({
  channelId,
  ledgerId,
});

export const indirectFundingWalletState = (
  indirectFundingStateType: string,
): walletStates.Initialized => {
  let indirectFunding: IndirectFundingState;
  switch (indirectFundingStateType) {
    case indirectFundingPlayerA.WAIT_FOR_APPROVAL:
      indirectFunding = waitForApprovalState;
      break;
    case indirectFundingPlayerA.WAIT_FOR_PRE_FUND_SETUP_1:
      indirectFunding = waitForPreFundSetup1State;
      break;
    case indirectFundingPlayerA.WAIT_FOR_DIRECT_FUNDING:
      indirectFunding = waitForDirectFundingState;
      break;
    case indirectFundingPlayerA.WAIT_FOR_POST_FUND_SETUP_1:
      indirectFunding = waitForPostFundSetup1State;
      break;
    case indirectFundingPlayerA.WAIT_FOR_LEDGER_UPDATE_1:
      indirectFunding = waitForLedgerUpdate1State;
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
