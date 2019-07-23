import {
  ledgerCommitment,
  asAddress,
  bsAddress,
  ledgerId,
  threeWayLedgerCommitment,
  threeWayLedgerId,
  addressAndPrivateKeyLookup,
} from '../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { setChannels, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as states from '../states';
import { commitmentsReceived } from '../../../../communication';
import { ThreePartyPlayerIndex, TwoPartyPlayerIndex } from '../../../types';
import { clearedToSend } from '../actions';
import { SignedCommitment } from '../../../../domain';
import { unreachable } from '../../../../utils/reducer-utils';

const protocolLocator = [];

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
// Commitments that have reached consensus
const balances = twoThree;
const proposedBalances = twoThreeOneTwo;
const ledger4 = ledgerCommitment({ turnNum: 4, balances });
const ledger5 = ledgerCommitment({ turnNum: 5, balances });
const ledger6 = ledgerCommitment({ turnNum: 6, balances });
const ledger6ConsensusOnProposed = ledgerCommitment({ turnNum: 6, balances: proposedBalances });
const ledger7 = ledgerCommitment({ turnNum: 7, balances: proposedBalances });
const ledger8 = ledgerCommitment({ turnNum: 8, balances: proposedBalances });
const ledger20 = ledgerCommitment({ turnNum: 20, balances: proposedBalances });

// Commitments that propose a new consensus
const ledger5Propose = ledgerCommitment({ turnNum: 5, balances, proposedBalances });
const ledger6Propose = ledgerCommitment({ turnNum: 6, balances, proposedBalances });
const ledger7ProposeWrongProposedBalances = ledgerCommitment({
  turnNum: 7,
  balances,
  proposedBalances: balances,
});
const ledger7Propose = ledgerCommitment({
  turnNum: 7,
  balances,
  proposedBalances,
});
const ledger8Propose = ledgerCommitment({ turnNum: 8, balances, proposedBalances });
const ledger19Propose = ledgerCommitment({ turnNum: 19, balances, proposedBalances });

type AcceptConsensusOnBalancesTurnNum = 5 | 6;
function acceptConsensusOnBalancesLedgers(turnNum: AcceptConsensusOnBalancesTurnNum) {
  switch (turnNum) {
    case 5:
      return [ledger4, ledger5];
    case 6:
      return [ledger5, ledger6];
    default:
      return unreachable(turnNum);
  }
}

type AcceptConsensusOnProposedBalancesTurnNum = 6 | 7 | 8 | 20;
function acceptConsensusOnProposedBalancesLedgers(
  turnNum: AcceptConsensusOnProposedBalancesTurnNum,
) {
  switch (turnNum) {
    case 6:
      return [ledger5Propose, ledger6ConsensusOnProposed];
    case 7:
      return [ledger6Propose, ledger7];
    case 8:
      return [ledger7Propose, ledger8];
    case 20:
      return [ledger19Propose, ledger20];
    default:
      return unreachable(turnNum);
  }
}

type ProposeTurnNum = 5 | 6 | 7 | 8;
const proposeLedgers: { [turnNum in ProposeTurnNum]: SignedCommitment[] } = {
  5: [ledger4, ledger5Propose],
  6: [ledger5, ledger6Propose],
  7: [ledger6, ledger7Propose],
  8: [ledger7ProposeWrongProposedBalances, ledger8Propose],
};

type ProposeOldTurnNum = 7;
const proposeOldLedgers: { [turnNum in ProposeOldTurnNum]: SignedCommitment[] } = {
  7: [ledger6, ledger7ProposeWrongProposedBalances],
};

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

const twoPlayerConsensusAcceptedOnBalancesSharedData = (
  turnNum: AcceptConsensusOnBalancesTurnNum,
  ourIndex: TwoPartyPlayerIndex,
) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      acceptConsensusOnBalancesLedgers(turnNum),
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);

const twoPlayerConsensusAcceptedOnProposedBalancesSharedData = (
  turnNum: AcceptConsensusOnProposedBalancesTurnNum,
  ourIndex: TwoPartyPlayerIndex,
) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      acceptConsensusOnProposedBalancesLedgers(turnNum),
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);

const twoPlayerNewProposalSharedData = (turnNum: ProposeTurnNum, ourIndex: TwoPartyPlayerIndex) =>
  setChannels(EMPTY_SHARED_DATA, [
    channelFromCommitments(
      proposeLedgers[turnNum],
      addressAndPrivateKeyLookup[ourIndex].address,
      addressAndPrivateKeyLookup[ourIndex].privateKey,
    ),
  ]);

// ------
// States
// ------
const proposedAllocation = twoThreeOneTwo.map(b => b.wei);
const proposedDestination = twoThreeOneTwo.map(b => b.address);

const threePlayerProposedAllocation = oneOneFour.map(b => b.wei);
const threePlayerProposedDestination = oneOneFour.map(b => b.address);
const processId = 'process-id.123';

const twoProps = {
  channelId: ledgerId,
  processId,
  proposedAllocation,
  proposedDestination,
  protocolLocator,
};

const threeProps = {
  channelId: threeWayLedgerId,
  processId,
  proposedAllocation: threePlayerProposedAllocation,
  proposedDestination: threePlayerProposedDestination,
  protocolLocator,
};

const twoPlayerNotSafeToSend = (cleared: boolean) => {
  return states.notSafeToSend({
    ...twoProps,
    clearedToSend: cleared,
  });
};

const twoPlayerCommitmentSent = states.commitmentSent(twoProps);

const threePlayerNotSafeToSend = (cleared: boolean) => {
  return states.notSafeToSend({
    ...threeProps,
    clearedToSend: cleared,
  });
};

const threePlayerCommitmentSent = states.commitmentSent(threeProps);

// ------
// Actions
// ------
function twoPlayerNewProposalCommitmentsReceived(turnNum: ProposeTurnNum) {
  return commitmentsReceived({
    processId,
    signedCommitments: proposeLedgers[turnNum],
    protocolLocator,
  });
}
function twoPlayerWrongProposalCommitmentsReceived(turnNum: ProposeTurnNum) {
  return commitmentsReceived({
    processId,
    signedCommitments: proposeOldLedgers[turnNum],
    protocolLocator,
  });
}
function twoPlayerAcceptConsensusOnProposedBalancesCommitmentsReceived(
  turnNum: AcceptConsensusOnProposedBalancesTurnNum,
) {
  return commitmentsReceived({
    processId,
    signedCommitments: acceptConsensusOnProposedBalancesLedgers(turnNum),
    protocolLocator,
  });
}

const threePlayerUpdate0Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  protocolLocator,
});
const threePlayerUpdate1Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  protocolLocator,
});

const threePlayerUpdate2Received = commitmentsReceived({
  processId,
  signedCommitments: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  protocolLocator,
});
const clearedToSendAction = clearedToSend({
  processId,
  protocolLocator,
});

export const twoPlayerAHappyPath = {
  initialize: {
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.A),
    reply: [ledger5, ledger6Propose],
    clearedToSend: true,
    protocolLocator,
  },
  commitmentSent: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerAcceptConsensusOnProposedBalancesCommitmentsReceived(7),
  },
};

export const twoPlayerANotOurTurn = {
  initialize: {
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(6, TwoPartyPlayerIndex.A),
    clearedToSend: true,
    protocolLocator,
  },
  notSafeToSend: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerNewProposalCommitmentsReceived(7),
    reply: acceptConsensusOnProposedBalancesLedgers(8),
  },
};

export const twoPlayerBHappyPath = {
  initialize: {
    processId,
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    clearedToSend: true,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    protocolLocator,
  },
  notSafeToSend: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerNewProposalCommitmentsReceived(6),
    reply: acceptConsensusOnProposedBalancesLedgers(7),
  },
  commitmentSent: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerConsensusAcceptedOnBalancesSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerNewProposalCommitmentsReceived(6),
  },
};

export const twoPlayerBOurTurn = {
  initialize: {
    channelId: ledgerId,
    proposedAllocation,
    proposedDestination,
    processId,
    sharedData: twoPlayerConsensusAcceptedOnProposedBalancesSharedData(6, TwoPartyPlayerIndex.B),
    reply: [ledger5, ledger6Propose],
    clearedToSend: true,
    protocolLocator,
  },
  commitmentSent: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.B),
    action: twoPlayerAcceptConsensusOnProposedBalancesCommitmentsReceived(7),
  },
};

export const twoPlayerACommitmentRejected = {
  wrongTurn: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerAcceptConsensusOnProposedBalancesCommitmentsReceived(20),
  },
  wrongProposalWhenCommitmentNotSent: {
    state: twoPlayerNotSafeToSend(true),
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerWrongProposalCommitmentsReceived(7),
    reply: proposeLedgers[8],
  },
  notConsensusWhenCommitmentSent: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerNewProposalSharedData(6, TwoPartyPlayerIndex.A),
    action: twoPlayerNewProposalCommitmentsReceived(7),
  },
};

export const twoPlayerBCommitmentRejected = {
  commitmentSent: {
    state: twoPlayerCommitmentSent,
    sharedData: twoPlayerNewProposalSharedData(5, TwoPartyPlayerIndex.B),
    action: twoPlayerAcceptConsensusOnProposedBalancesCommitmentsReceived(20),
  },
};

export const threePlayerAHappyPath = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: true,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  },
  waitForPlayerBUpdate: {
    state: threePlayerCommitmentSent,
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    action: threePlayerUpdate1Received,
  },
  waitForHubUpdate: {
    state: threePlayerCommitmentSent,
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
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: threePlayerUpdate0Received,
    reply: [threePlayerLedger8, threePlayerLedger9, threePlayerLedger10],
  },
  waitForHubUpdate: {
    state: threePlayerCommitmentSent,
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
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received,
  },
  waitForPlayerBUpdate: {
    state: threePlayerNotSafeToSend(true),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
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
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
  },
  notSafeToSendAndOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.A),
    action: clearedToSendAction,
    reply: [threePlayerLedger7, threePlayerLedger8, threePlayerLedger9],
  },
  notSafeToSendAndNotOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    action: clearedToSendAction,
  },
};

export const threePlayerBNotClearedToSend = {
  initialize: {
    channelId: threeWayLedgerId,
    processId,
    proposedAllocation: threePlayerProposedAllocation,
    proposedDestination: threePlayerProposedDestination,
    clearedToSend: false,
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
  },
  notClearedToSendAndNotOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.B),
    action: clearedToSendAction,
  },
  notClearedToSendAndOurTurn: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.B),
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
    protocolLocator,
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
  },
  waitForPlayerAUpdate: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerInitialSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate0Received,
  },
  waitForPlayerBUpdate: {
    state: threePlayerNotSafeToSend(false),
    sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.Hub),
    action: threePlayerUpdate1Received,
  },
  waitForClearedToSend: {
    state: threePlayerNotSafeToSend(false),
    action: clearedToSendAction,
    sharedData: threePlayerSecondUpdateSharedData(ThreePartyPlayerIndex.Hub),
    reply: [threePlayerLedger9, threePlayerLedger10, threePlayerLedger11],
  },
};

export const threePlayerNotOurTurn = {
  playerA: {
    initialize: {
      channelId: threeWayLedgerId,
      processId,
      proposedAllocation: threePlayerProposedAllocation,
      proposedDestination: threePlayerProposedDestination,
      clearedToSend: true,
      sharedData: threePlayerFirstUpdateSharedData(ThreePartyPlayerIndex.A),
    },
  },
};
