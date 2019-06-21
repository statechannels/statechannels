import {
  ledgerCommitment,
  asAddress,
  bsAddress,
  asPrivateKey,
  ledgerId,
  channelId,
  bsPrivateKey,
  appCommitment,
} from '../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils/bignumber';
import { SharedData, EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as states from '../states';
import * as globalActions from '../../../actions';
import { EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR } from '../reducer';

const processId = 'processId';

const twoTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const fourToApp = [{ address: channelId, wei: bigNumberify(4).toHexString() }];
const props = {
  channelId,
  ledgerId,
  processId,
  proposedAmount: fourToApp[0].wei,
};

const setFundingState = (sharedData: SharedData): SharedData => {
  return {
    ...sharedData,
    fundingState: { [channelId]: { directlyFunded: false, fundingChannel: ledgerId } },
  };
};

// -----------
// Commitments
// -----------
const ledger4 = ledgerCommitment({ turnNum: 4, balances: twoTwo });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: twoTwo });
const ledger6 = ledgerCommitment({ turnNum: 6, balances: twoTwo, proposedBalances: fourToApp });
const ledger7 = ledgerCommitment({ turnNum: 7, balances: fourToApp });
const app0 = appCommitment({ turnNum: 0, balances: twoTwo });
const app1 = appCommitment({ turnNum: 1, balances: twoTwo });
const app2 = appCommitment({ turnNum: 2, balances: twoTwo });
const app3 = appCommitment({ turnNum: 3, balances: twoTwo });
// -----------
// Shared Data
// -----------
const initialPlayerALedgerSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);
const playerAFirstCommitmentReceived = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger5, ledger6], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);

const playerAUpdateCommitmentsReceived = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger6, ledger7], asAddress, asPrivateKey),
    channelFromCommitments([app1, app2], asAddress, asPrivateKey),
  ]),
);

const playerBFirstPostFundSetupReceived = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger6, ledger7], bsAddress, bsPrivateKey),
    channelFromCommitments([app0, app1], bsAddress, bsPrivateKey),
  ]),
);

const initialPlayerBLedgerSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4, ledger5], bsAddress, bsPrivateKey),
  ]),
);

// -----------
// States
// -----------
const waitForLedgerUpdate = states.waitForLedgerUpdate(props);
const waitForPostFundSetup = states.waitForPostFundSetup(props);
// -----------
// Actions
// -----------
const ledgerUpdate0Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger6,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});
const ledgerUpdate1Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger7,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});
const appPostFundSetup0Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: app2,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});
const appPostFundSetup1Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: app3,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});
const invalidLedgerUpdateReceived = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger5,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});
const invalidPostFundReceived = globalActions.commitmentReceived({
  processId,
  signedCommitment: app0,
  protocolLocator: EXISTING_CHANNEL_FUNDING_PROTOCOL_LOCATOR,
});

export const playerAFullyFundedHappyPath = {
  initialize: {
    sharedData: initialPlayerALedgerSharedData,
    ...props,
    reply: ledger6,
  },
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: playerAFirstCommitmentReceived,
    action: ledgerUpdate1Received,
    reply: app3,
  },
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: playerAUpdateCommitmentsReceived,
    action: appPostFundSetup1Received,
  },
};

export const playerBFullyFundedHappyPath = {
  initialize: {
    sharedData: initialPlayerBLedgerSharedData,
    ...props,
  },
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: initialPlayerBLedgerSharedData,
    action: ledgerUpdate0Received,
    reply: ledger7,
  },
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: playerBFirstPostFundSetupReceived,
    action: appPostFundSetup0Received,
    reply: app3,
  },
};

export const playerAInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: playerAFirstCommitmentReceived,
    action: invalidLedgerUpdateReceived,
  },
};

export const playerAInvalidPostFundCommitment = {
  waitForPostFundSetup: {
    state: waitForPostFundSetup,
    sharedData: playerAUpdateCommitmentsReceived,
    action: invalidPostFundReceived,
  },
};

export const playerBInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: initialPlayerBLedgerSharedData,
    action: invalidLedgerUpdateReceived,
  },
};

export const playerBInvalidPostFundCommitment = {
  waitForPostFundSetup: {
    state: waitForLedgerUpdate,
    sharedData: playerBFirstPostFundSetupReceived,
    action: invalidPostFundReceived,
  },
};
