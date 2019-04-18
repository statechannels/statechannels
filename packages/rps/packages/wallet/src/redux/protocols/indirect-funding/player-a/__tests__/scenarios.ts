import { PlayerIndex } from 'magmo-wallet-client/lib/wallet-instructions';
import { emptyDisplayOutboxState } from '../../../../outbox/state';
import * as channelStates from '../../../../channel-state/state';
import { ProtocolStateWithSharedData } from '../../../../protocols';
import * as testScenarios from '../../../../__tests__/test-scenarios';
import {
  channelId,
  ledgerDirectFundingStates,
  ledgerId,
} from '../../../../__tests__/test-scenarios';
import * as states from '../state';
import { EMPTY_SHARED_DATA } from '../../../../state';

const protocolStateDefaults = {
  channelId,
  ledgerId,
};

// Channel states for app channel
const channelStateDefaults = {
  ourIndex: PlayerIndex.A,
  privateKey: testScenarios.asPrivateKey,
  channelId,
  libraryAddress: testScenarios.libraryAddress,
  participants: testScenarios.participants,
  channelNonce: testScenarios.channelNonce,
  address: testScenarios.participants[0],
};

const waitForFundingAppChannelState = channelStates.waitForFundingAndPostFundSetup({
  ...channelStateDefaults,
  funded: false,
  turnNum: 5,
  lastCommitment: {
    commitment: testScenarios.preFundCommitment2,
    signature: '0x0',
  },
  penultimateCommitment: {
    commitment: testScenarios.preFundCommitment1,
    signature: '0x0',
  },
});

// Channel states for the ledger channel
const ledgerChannelDefaults = {
  channelId: ledgerId,
  libraryAddress: testScenarios.ledgerChannel.channelType,
  ourIndex: PlayerIndex.A,
  participants: testScenarios.ledgerChannel.participants as [string, string],
  channelNonce: testScenarios.ledgerChannel.nonce,
  address: testScenarios.ledgerChannel.participants[0],
  privateKey: testScenarios.asPrivateKey,
};

const ledgerChannelPrefundCommitments = {
  lastCommitment: {
    commitment: testScenarios.ledgerCommitments.preFundCommitment1,
    signature: '0x0',
  },
  penultimateCommitment: {
    commitment: testScenarios.ledgerCommitments.preFundCommitment0,
    signature: '0x0',
  },
};

const waitForPrefundSetupLedgerChannelState = channelStates.waitForPreFundSetup({
  ...ledgerChannelDefaults,
  funded: false,
  // This turn number does not seem to matter for unit tests.
  turnNum: 2,
  lastCommitment: {
    commitment: testScenarios.ledgerCommitments.preFundCommitment0,
    signature: '0x0',
  },
});

const waitForFundingLedgerChannelState = channelStates.waitForFundingAndPostFundSetup({
  ...ledgerChannelDefaults,
  funded: false,
  // This turn number does not seem to matter for unit tests.
  turnNum: 5,
  ...ledgerChannelPrefundCommitments,
});

const waitForPostFundSetupLedgerChannelState = channelStates.aWaitForPostFundSetup({
  ...ledgerChannelDefaults,
  funded: false,
  turnNum: 2,
  ...ledgerChannelPrefundCommitments,
});

const waitForUpdateLedgerChannelState = channelStates.waitForUpdate({
  ...ledgerChannelDefaults,
  funded: true,
  turnNum: testScenarios.ledgerCommitments.postFundCommitment1.turnNum,
  // TODO: these commitments do not match the waitForUpdate state, but the unit tests still pass...
  ...ledgerChannelPrefundCommitments,
});

const constructWalletState = (
  protocolState: states.PlayerAState,
  ...channelStatuses: channelStates.ChannelStatus[]
): ProtocolStateWithSharedData<states.PlayerAState> => {
  const channelState = channelStates.emptyChannelState();
  for (const channelStatus of channelStatuses) {
    channelState.initializedChannels[channelStatus.channelId] = { ...channelStatus };
  }
  return {
    protocolState,
    sharedData: {
      outboxState: emptyDisplayOutboxState(),
      channelState,
    },
  };
};

// Wallet happy path states
const waitForApproval = constructWalletState(
  states.waitForApproval(protocolStateDefaults),
  waitForFundingAppChannelState,
);

const waitForPreFundSetup1 = constructWalletState(
  states.waitForPreFundSetup1(protocolStateDefaults),
  waitForFundingAppChannelState,
  waitForPrefundSetupLedgerChannelState,
);

const waitForDirectFunding = constructWalletState(
  states.waitForDirectFunding({
    ...protocolStateDefaults,
    directFundingState: ledgerDirectFundingStates.playerA,
  }),
  waitForFundingAppChannelState,
  waitForFundingLedgerChannelState,
);

const waitForPostFundSetup1 = constructWalletState(
  states.waitForPostFundSetup1(protocolStateDefaults),
  waitForFundingAppChannelState,
  waitForPostFundSetupLedgerChannelState,
);

const waitForLedgerUpdate1 = constructWalletState(
  states.waitForLedgerUpdate1(protocolStateDefaults),
  waitForFundingAppChannelState,
  waitForUpdateLedgerChannelState,
);

const sharedData = EMPTY_SHARED_DATA;

// TODO: maybe add happy path actions later. But these would only be used by unit tests, so maybe the actions do not belong here.
export const happyPath = {
  states: {
    waitForApproval,
    waitForPreFundSetup1,
    waitForDirectFunding,
    waitForPostFundSetup1,
    waitForLedgerUpdate1,
  },
  actions: {},
  sharedData,
};
