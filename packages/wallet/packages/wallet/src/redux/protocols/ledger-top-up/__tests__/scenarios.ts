import { bigNumberify } from 'ethers/utils';
import * as states from '../states';
import {
  noPostFundSetupsPreSuccessA,
  noPostFundSetupsPreSuccessB,
} from '../../direct-funding/__tests__';
import {
  channelId,
  ledgerId,
  asAddress,
  bsAddress,
  ledgerCommitment,
  addressAndPrivateKeyLookup,
} from '../../../../domain/commitments/__tests__';
import { TwoPartyPlayerIndex } from '../../../types';
import { twoPlayerPreSuccessA, twoPlayerPreSuccessB } from '../../consensus-update/__tests__';
import { setChannels } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { SignedCommitment } from '../../../../domain';

// ---------
// Test data
// ---------

const fourFive = [
  { address: asAddress, wei: bigNumberify(4).toHexString() },
  { address: bsAddress, wei: bigNumberify(5).toHexString() },
];

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];
const threeFourFlipped = [
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
  { address: asAddress, wei: bigNumberify(4).toHexString() },
];
const fourTwo = [
  { address: asAddress, wei: bigNumberify(4).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const processId = 'process-id.123';
const defaultProps = {
  processId,
  channelId,
  ledgerId,
  proposedAllocation: fourFive.map(a => a.wei),
  originalAllocation: twoThree.map(a => a.wei),
  proposedDestination: fourFive.map(a => a.address),
};

const oneOverFundedOneUnderFundedProps = {
  processId,
  channelId,
  ledgerId,
  proposedAllocation: fourTwo.map(a => a.wei),
  originalAllocation: twoThree.map(a => a.wei),
  proposedDestination: fourTwo.map(a => a.address),
};

const ledgerTwoThree = ledgerCommitment({ turnNum: 5, balances: twoThree });
const ledgerThreeFourFlipped = ledgerCommitment({ turnNum: 5, balances: threeFourFlipped });

// ------
// States
// ------
const switchOrderAndAddATopUpUpdate = props =>
  states.switchOrderAndAddATopUpUpdate({
    ...props,
    consensusUpdateState: twoPlayerPreSuccessA.state,
  });
const waitForDirectFundingForA = props =>
  states.waitForDirectFundingForA({
    ...props,
    directFundingState: noPostFundSetupsPreSuccessA.state,
  });
const restoreOrderAndAddBTopUpUpdate = props =>
  states.restoreOrderAndAddBTopUpUpdate({
    ...props,
    consensusUpdateState: twoPlayerPreSuccessA.state,
  });
const waitForDirectFundingForB = props =>
  states.waitForDirectFundingForB({
    ...props,
    directFundingState: noPostFundSetupsPreSuccessA.state,
  });

// ------
// Actions
// ------

const playerAConsensusUpdateSuccess = twoPlayerPreSuccessA.action;
const playerBConsensusUpdateSuccess = twoPlayerPreSuccessB.action;
const playerAFundingSuccess = noPostFundSetupsPreSuccessA.action;
const playerBFundingSuccess = noPostFundSetupsPreSuccessB.action;

// ------
// Shared Data
// ------
const consensusSharedData = (ourIndex: TwoPartyPlayerIndex) => {
  return ourIndex === TwoPartyPlayerIndex.A
    ? twoPlayerPreSuccessA.sharedData
    : twoPlayerPreSuccessB.sharedData;
};
const fundingSharedData = (ourIndex: TwoPartyPlayerIndex, latestCommitment: SignedCommitment) => {
  return setChannels(
    ourIndex === TwoPartyPlayerIndex.A
      ? noPostFundSetupsPreSuccessA.sharedData
      : noPostFundSetupsPreSuccessB.sharedData,
    [
      channelFromCommitments(
        [latestCommitment],
        addressAndPrivateKeyLookup[ourIndex].address,
        addressAndPrivateKeyLookup[ourIndex].privateKey,
      ),
    ],
  );
};

// ------
// Scenarios
// ------
export const playerAHappyPath = {
  initialize: {
    ...defaultProps,
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerTwoThree),
  },

  switchOrderAndAddATopUpUpdate: {
    state: switchOrderAndAddATopUpUpdate(defaultProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.A),
    action: playerAConsensusUpdateSuccess,
  },
  waitForDirectFundingForA: {
    state: waitForDirectFundingForA(defaultProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerThreeFourFlipped),
    action: playerAFundingSuccess,
  },
  restoreOrderAndAddBTopUpUpdate: {
    state: restoreOrderAndAddBTopUpUpdate(defaultProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.A),
    action: playerAConsensusUpdateSuccess,
  },
  waitForDirectFundingForB: {
    state: waitForDirectFundingForB(defaultProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerThreeFourFlipped),
    action: playerAFundingSuccess,
  },
};

export const playerBHappyPath = {
  initialize: {
    ...defaultProps,
    sharedData: fundingSharedData(TwoPartyPlayerIndex.B, ledgerTwoThree),
  },

  switchOrderAndAddATopUpUpdate: {
    state: switchOrderAndAddATopUpUpdate(defaultProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.B),
    action: playerBConsensusUpdateSuccess,
  },
  waitForDirectFundingForA: {
    state: waitForDirectFundingForA(defaultProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.B, ledgerThreeFourFlipped),
    action: playerBFundingSuccess,
  },
  restoreOrderAndAddBTopUpUpdate: {
    state: restoreOrderAndAddBTopUpUpdate(defaultProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.B),
    action: playerBConsensusUpdateSuccess,
  },
  waitForDirectFundingForB: {
    state: waitForDirectFundingForB(defaultProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerThreeFourFlipped),
    action: playerBFundingSuccess,
  },
};

export const playerAOneUserNeedsTopUp = {
  initialize: {
    ...oneOverFundedOneUnderFundedProps,
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerTwoThree),
  },

  switchOrderAndAddATopUpUpdate: {
    state: switchOrderAndAddATopUpUpdate(oneOverFundedOneUnderFundedProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.A),
    action: playerAConsensusUpdateSuccess,
  },
  waitForDirectFundingForA: {
    state: waitForDirectFundingForA(oneOverFundedOneUnderFundedProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.A, ledgerThreeFourFlipped),
    action: playerAFundingSuccess,
  },
  restoreOrderAndAddBTopUpUpdate: {
    state: restoreOrderAndAddBTopUpUpdate(oneOverFundedOneUnderFundedProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.A),
    action: playerAConsensusUpdateSuccess,
  },
};

export const playerBOneUserNeedsTopUp = {
  initialize: {
    ...oneOverFundedOneUnderFundedProps,
    sharedData: fundingSharedData(TwoPartyPlayerIndex.B, ledgerTwoThree),
  },

  switchOrderAndAddATopUpUpdate: {
    state: switchOrderAndAddATopUpUpdate(oneOverFundedOneUnderFundedProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.B),
    action: playerAConsensusUpdateSuccess,
  },
  waitForDirectFundingForA: {
    state: waitForDirectFundingForA(oneOverFundedOneUnderFundedProps),
    sharedData: fundingSharedData(TwoPartyPlayerIndex.B, ledgerThreeFourFlipped),
    action: playerAFundingSuccess,
  },
  restoreOrderAndAddBTopUpUpdate: {
    state: restoreOrderAndAddBTopUpUpdate(oneOverFundedOneUnderFundedProps),
    sharedData: consensusSharedData(TwoPartyPlayerIndex.B),
    action: playerAConsensusUpdateSuccess,
  },
};
