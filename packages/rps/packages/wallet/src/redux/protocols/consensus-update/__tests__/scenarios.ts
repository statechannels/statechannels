import {
  ledgerCommitment,
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  ledgerId,
  threeWayLedgerCommitment,
  threeWayLedgerId,
  addressAndPrivateKeyLookup,
} from '../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { setChannels, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as states from '../states';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from '../reducer';
import { commitmentsReceived } from '../../../../communication';
import { ThreePartyPlayerIndex } from '../../../types';
import { clearedToSend } from '../actions';

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];
const twoThreeOneTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const twoThreeOne = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
  { address: asAddress, wei: bigNumberify(1).toHexString() },
];

const oneOneFour = [
  { address: asAddress, wei: bigNumberify(1).toHexString() },
  { address: bsAddress, wei: bigNumberify(1).toHexString() },
  { address: asAddress, wei: bigNumberify(4).toHexString() },
];
const ledger20 = ledgerCommitment({ turnNum: 20, balances: twoThree });
const ledger4 = ledgerCommitment({ turnNum: 4, balances: twoThree });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: twoThree });
const ledger6 = ledgerCommitment({
  turnNum: 6,
  balances: twoThree,
  proposedBalances: twoThreeOneTwo,
});
const ledger7 = ledgerCommitment({
  turnNum: 7,
  balances: twoThreeOneTwo,
});

const threePlayerLedger6 = threeWayLedgerCommitment({ turnNum: 6, balances: twoThreeOne });
const threePlayerLedger7 = threeWayLedgerCommitment({ turnNum: 7, balances: twoThreeOne });
const threePlayerLedger8 = threeWayLedgerCommitment({ turnNum: 8, balances: twoThreeOne });
const threePlayerLedger9 = threeWayLedgerCommitment({
  turnNum: 9,
  balances: twoThreeOne,
  proposedBalances: oneOneFour,
});
const threePlayerLedger10 = threeWayLedgerCommitment({
  turnNum: 10,
  balances: twoThreeOne,
  proposedBalances: oneOneFour,
  isVote: true,
});
const threePlayerLedger11 = threeWayLedgerCommitment({
  turnNum: 11,
  balances: oneOneFour,
});

// ------
// SharedData
// ------

const threePlayerInitialSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      [threePlayerLedger6, threePlayerLedger7, threePlayerLedger8],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);
};
const threePlayerFirstUpdateSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);
};
const threePlayerSecondUpdateSharedData = (ourIndex: ThreePartyPlayerIndex) => {
  return setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);
};

const twoPlayerAInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
]);
const twoPlayerAUpdate0ReceivedSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5, ledger6], asAddress, asPrivateKey),
]);
const twoPlayerBInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], bsAddress, bsPrivateKey),
]);

const proposedAllocation = twoThreeOneTwo.map(b => b.wei);
const proposedDestination = twoThreeOneTwo.map(b => b.address);

const threePlayerProposedAllocation = oneOneFour.map(b => b.wei);
const threePlayerProposedDestination = oneOneFour.map(b => b.address);
const processId = 'process-id.123';
// ------
// States
// ------
// tslint:disable-next-line: no-shadowed-variable
const twoPlayerWaitForUpdate = (clearedToSend: boolean, updateSent: boolean) => {
  return states.waitForUpdate({
    channelId: ledgerId,
    processId,
    proposedAllocation,
    proposedDestination,
    clearedToSend,
    updateSent,
  });
};

// tslint:disable-next-line: no-shadowed-variable
const threePlayerWaitForUpdate = (clearedToSend, updateSent) => {
  return states.waitForUpdate({
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend,
    updateSent,
  });
};

// ------
// Actions
// ------
const twoPlayerUpdate0Received = commitmentsReceived({
  processId,
  signedCommitments: [ledger6],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const twoPlayerUpdate1Received = commitmentsReceived({
  processId,
  signedCommitments: [ledger6, ledger7],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const twoPlayerInvalidUpdateReceived = commitmentsReceived({
  processId,
  signedCommitments: [ledger20],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});

const threePlayerUpdate0Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const threePlayerUpdate1Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});

const threePlayerUpdate2Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const clearedToSendAction = clearedToSend({
  processId,
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
export const twoPlayerAHappyPath = {
  initialize: {
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    processId,
    sharedData: twoPlayerAInitialSharedData,
    reply: [ledger5, ledger6],
    clearedToSend: true,
  },
  waitForUpdate: {
    state: twoPlayerWaitForUpdate(true, true),
    sharedData: twoPlayerAUpdate0ReceivedSharedData,
    action: twoPlayerUpdate1Received,
  },
};

export const twoPlayerBHappyPath = {
  initialize: {
    processId,
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    clearedToSend: true,
    sharedData: twoPlayerBInitialSharedData,
  },
  waitForUpdate: {
    state: twoPlayerWaitForUpdate(true, false),
    sharedData: twoPlayerBInitialSharedData,
    action: twoPlayerUpdate0Received,
    reply: [ledger6, ledger7],
  },
};

export const twoPlayerACommitmentRejected = {
  waitForUpdate: {
    state: twoPlayerWaitForUpdate(true, true),
    sharedData: twoPlayerAUpdate0ReceivedSharedData,
    action: twoPlayerInvalidUpdateReceived,
  },
};

export const twoPlayerBCommitmentRejected = {
  waitForUpdate: {
    state: twoPlayerWaitForUpdate(true, false),
    sharedData: twoPlayerBInitialSharedData,
    action: twoPlayerInvalidUpdateReceived,
  },
};

export const threePlayerAHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: true,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  },
  waitForPlayerBUpdate: {
    state: threePlayerWaitForUpdate(true, true),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    action: threePlayerUpdate1Received,
  },
  waitForHubUpdate: {
    state: threePlayerWaitForUpdate(true, true),
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.A),
    action: threePlayerUpdate2Received,
  },
};

export const threePlayerBHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: true,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
  },
  waitForPlayerAUpdate: {
    state: threePlayerWaitForUpdate(true, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate0Received,
    reply: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  },
  waitForHubUpdate: {
    state: threePlayerWaitForUpdate(true, true),
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate2Received,
  },
};

export const threePlayerHubHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: true,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
  },
  waitForPlayerAUpdate: {
    state: threePlayerWaitForUpdate(true, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received,
  },
  waitForPlayerBUpdate: {
    state: threePlayerWaitForUpdate(true, false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate1Received,
    reply: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  },
};

export const threePlayerANotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: false,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
  },
  waitForUpdateAndClearedToSend: {
    state: threePlayerWaitForUpdate(false, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    action: clearedToSendAction,
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  },
};

export const threePlayerBNotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: false,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
  },
  waitForUpdateAndClearedToSend: {
    state: threePlayerWaitForUpdate(false, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: clearedToSendAction,
  },
  waitForPlayerAUpdate: {
    state: threePlayerWaitForUpdate(true, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate0Received,
    reply: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  },
};

export const threePlayerHubNotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: false,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
  },
  waitForPlayerAUpdate: {
    state: threePlayerWaitForUpdate(false, false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received,
  },
  waitForPlayerBUpdate: {
    state: threePlayerWaitForUpdate(false, false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate1Received,
  },
  waitForClearedToSend: {
    state: threePlayerWaitForUpdate(false, false),
    action: clearedToSendAction,
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.Hub),
    reply: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  },
};
