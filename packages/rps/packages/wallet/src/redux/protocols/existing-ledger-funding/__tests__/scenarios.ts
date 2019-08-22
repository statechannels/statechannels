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

import { EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR } from '../reducer';
import { playerAHappyPath } from '../../ledger-top-up/__tests__/scenarios';
import {
  twoPlayerPreSuccessA as consensusUpdatePreSuccessA,
  twoPlayerPreSuccessB as consensusUpdatePreSuccessB,
} from '../../consensus-update/__tests__/';
import { makeLocator, prependToLocator } from '../..';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from '../../consensus-update/reducer';
import { commitmentsReceived } from '../../../../communication';
const processId = 'processId';
const oneThree = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const twoTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const fourFour = [
  { address: asAddress, wei: bigNumberify(4).toHexString() },
  { address: bsAddress, wei: bigNumberify(4).toHexString() },
];
const oneOne = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(1).toHexString() },
];

const fourToApp = [{ address: channelId, wei: bigNumberify(4).toHexString() }];
const fourToAppAndLeftOver = [
  { address: channelId, wei: bigNumberify(4).toHexString() },
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];
const props = {
  channelId,
  ledgerId,
  processId,
  startingAllocation: oneThree.map(o => o.wei),
  startingDestination: oneThree.map(o => o.address),
  protocolLocator: EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
};

const propsA = {
  ...props,
  consensusUpdateState: consensusUpdatePreSuccessA.state,
};

const propsB = {
  ...props,
  consensusUpdateState: consensusUpdatePreSuccessB.state,
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

const ledger4Partial = ledgerCommitment({ turnNum: 4, balances: fourFour });
const ledger5Partial = ledgerCommitment({ turnNum: 5, balances: fourFour });
const ledger6Partial = ledgerCommitment({
  turnNum: 6,
  balances: fourFour,
  proposedBalances: fourToAppAndLeftOver,
});
const topUpLedger4 = ledgerCommitment({ turnNum: 4, balances: oneOne });
const topUpLedger5 = ledgerCommitment({ turnNum: 5, balances: oneOne });

const app0 = appCommitment({ turnNum: 0, balances: oneThree });
const app1 = appCommitment({ turnNum: 1, balances: oneThree });
// -----------
// Shared Data
// -----------

const initialPlayerALedgerSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
    channelFromCommitments([app0, app1], asAddress, asPrivateKey),
  ]),
);

const initialPlayerAPartialSharedData = setFundingState(
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments([ledger4Partial, ledger5Partial], asAddress, asPrivateKey),
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
const waitForLedgerUpdateForA = states.waitForLedgerUpdate(propsA);
const waitForLedgerUpdateForB = states.waitForLedgerUpdate(propsB);

const invalidLedgerUpdateReceived = commitmentsReceived({
  processId,
  signedCommitments: [ledger5],
  protocolLocator: makeLocator(
    EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
  ),
});

export const playerAFullyFundedHappyPath = {
  initialize: {
    sharedData: initialPlayerALedgerSharedData,
    ...props,
    reply: [ledger5, ledger6],
  },
  waitForLedgerUpdate: {
    state: waitForLedgerUpdateForA,
    sharedData: consensusUpdatePreSuccessA.sharedData,
    action: prependToLocator(
      consensusUpdatePreSuccessA.action,
      EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    ),
  },
};

export const partialLedgerChannelUse = {
  initialize: {
    sharedData: initialPlayerAPartialSharedData,
    ...props,
    startingAllocation: twoTwo.map(o => o.wei),
    startingDestination: twoTwo.map(o => o.address),
    reply: [ledger5Partial, ledger6Partial],
  },
};

export const playerBFullyFundedHappyPath = {
  initialize: {
    sharedData: initialPlayerBLedgerSharedData,
    ...props,
  },
  waitForLedgerUpdate: {
    state: waitForLedgerUpdateForB,
    sharedData: consensusUpdatePreSuccessB.sharedData,
    action: prependToLocator(
      consensusUpdatePreSuccessB.action,
      EXISTING_LEDGER_FUNDING_PROTOCOL_LOCATOR,
    ),
    reply: consensusUpdatePreSuccessB.reply,
  },
};

export const playerAInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdateForA,
    sharedData: playerAFirstCommitmentReceived,
    action: invalidLedgerUpdateReceived,
  },
};

export const playerBInvalidUpdateCommitment = {
  waitForLedgerUpdate: {
    state: waitForLedgerUpdateForB,
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
      consensusUpdateState: consensusUpdatePreSuccessA.state,
    }),
  },
};

export const playerBTopUpNeeded = {
  initialize: {
    sharedData: initialPlayerBTopUpNeededSharedData,
    ...props,
  },
};
