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
import { EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR } from '../reducer';
import { playerAHappyPath } from '../../ledger-top-up/__tests__/scenarios';

const processId = 'processId';

const oneThree = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const oneOne = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(1).toHexString() },
];

const fourToApp = [{ address: channelId, wei: bigNumberify(4).toHexString() }];
const props = {
  channelId,
  ledgerId,
  processId,
  targetAllocation: oneThree.map(o => o.wei),
  targetDestination: oneThree.map(o => o.address),
};

const setFundingState = (sharedData: SharedData): SharedData => {
  return {
    ...sharedData,
    fundingState: {
      [channelId]: { directlyFunded: false, fundingChannel: ledgerId },
      [ledgerId]: { directlyFunded: true },
    },
  };
};

// -----------
// Commitments
// -----------
const ledger4 = ledgerCommitment({ turnNum: 4, balances: oneThree });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: oneThree });
const ledger6 = ledgerCommitment({ turnNum: 6, balances: oneThree, proposedBalances: fourToApp });
const ledger7 = ledgerCommitment({ turnNum: 7, balances: fourToApp });
const topUpLedger4 = ledgerCommitment({ turnNum: 4, balances: oneOne });
const topUpLedger5 = ledgerCommitment({ turnNum: 5, balances: oneOne });

const app0 = appCommitment({ turnNum: 0, balances: oneThree });
const app1 = appCommitment({ turnNum: 1, balances: oneThree });
const app3 = appCommitment({ turnNum: 3, balances: oneThree });
// -----------
// Shared Data
// -----------

const initialPlayerALedgerSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);

const initialPlayerATopUpNeededSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([topUpLedger4, topUpLedger5], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);

const playerAFirstCommitmentReceived = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger5, ledger6], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);

const initialPlayerBLedgerSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4, ledger5], bsAddress, bsPrivateKey),
    channelFromCommitments([app0, app1], bsAddress, bsPrivateKey),
  ]),
);

const initialPlayerBTopUpNeededSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([topUpLedger4, topUpLedger5], bsAddress, bsPrivateKey),
    channelFromCommitments([app0, app1], bsAddress, bsPrivateKey),
  ]),
);

// -----------
// States
// -----------
const waitForLedgerUpdate = states.waitForLedgerUpdate(props);
// -----------
// Actions
// -----------
const ledgerUpdate0Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger6,
  protocolLocator: EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
});
const ledgerUpdate1Received = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger7,
  protocolLocator: EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
});

const invalidLedgerUpdateReceived = globalActions.commitmentReceived({
  processId,
  signedCommitment: ledger5,
  protocolLocator: EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
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
};

export const playerAInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: playerAFirstCommitmentReceived,
    action: invalidLedgerUpdateReceived,
  },
};

export const playerBInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: initialPlayerBLedgerSharedData,
    action: invalidLedgerUpdateReceived,
  },
};

export const playerATopUpNeeded = {
  initialize: {
    sharedData: initialPlayerATopUpNeededSharedData,
    ...props,
  },
  waitForLedgerTopUp: {
    state: states.waitForLedgerTopUp({
      ...props,
      ledgerTopUpState: playerAHappyPath.switchOrderAndAddATopUpUpdate.state,
    }),
  },
};

export const playerBTopUpNeeded = {
  initialize: {
    sharedData: initialPlayerBTopUpNeededSharedData,
    ...props,
  },
};
