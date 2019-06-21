import {
  ledgerCommitment,
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  ledgerId,
} from '../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { setChannels, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as states from '../states';
import { commitmentReceived } from '../../../actions';
import { CONSENSUS_UPDATE_PROTOCOL_LOCATOR } from '../reducer';

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
const ledger0 = ledgerCommitment({ turnNum: 0, balances: twoThree });
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

// ------
// SharedData
// ------
const aInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
]);
const aUpdate0ReceivedSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger5, ledger6], asAddress, asPrivateKey),
]);
const bInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], bsAddress, bsPrivateKey),
]);

const proposedAllocation = twoThreeOneTwo.map(b => b.wei);
const proposedDestination = twoThreeOneTwo.map(b => b.address);
const processId = 'process-id.123';
// ------
// States
// ------
const waitForUpdate = states.waitForUpdate({
  channelId: ledgerId,
  processId,
  proposedAllocation,
  proposedDestination,
});

// ------
// Actions
// ------
const update0Received = commitmentReceived({
  processId,
  signedCommitment: ledger6,
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const update1Received = commitmentReceived({
  processId,
  signedCommitment: ledger7,
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
const invalidUpdateReceived = commitmentReceived({
  processId,
  signedCommitment: ledger0,
  protocolLocator: CONSENSUS_UPDATE_PROTOCOL_LOCATOR,
});
export const aHappyPath = {
  initialize: {
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    processId,
    sharedData: aInitialSharedData,
    reply: ledger6,
  },
  waitForUpdate: {
    state: waitForUpdate,
    sharedData: aUpdate0ReceivedSharedData,
    action: update1Received,
  },
};

export const bHappyPath = {
  initialize: {
    proposedAllocation,
    proposedDestination,
    sharedData: bInitialSharedData,
  },
  waitForUpdate: {
    state: waitForUpdate,
    sharedData: bInitialSharedData,
    action: update0Received,
    reply: ledger7,
  },
};

export const aCommitmentRejected = {
  waitForUpdate: {
    state: waitForUpdate,
    sharedData: aUpdate0ReceivedSharedData,
    action: invalidUpdateReceived,
  },
};

export const bCommitmentRejected = {
  waitForUpdate: {
    state: waitForUpdate,
    sharedData: bInitialSharedData,
    action: invalidUpdateReceived,
  },
};
