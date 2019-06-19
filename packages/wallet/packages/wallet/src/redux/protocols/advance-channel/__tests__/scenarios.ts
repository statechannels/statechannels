import * as states from '../states';
import { ThreePartyPlayerIndex } from '../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelId } from '../../../../domain/commitments/__tests__';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as scenarios from '../../../__tests__/test-scenarios';
import { commitmentsReceived } from '../../../../communication';

// We will use 2 different scenarios:
//
// 1. NewChannelAsA: CommitmentSent
//                -> Success
//
// 2. ExistingChannelAsA: NotSafeToSend
//                     -> CommitmentSent
//                     -> Success
//
// 3. NewChannelAsB: CommitmentSent
//                -> Success
//
// 4. ExistingChannelAsB: NotSafeToSend
//                     -> CommitmentSent
//                     -> Success
//

// ---------
// Test data
// ---------
const processId = 'Process.123';
const { asAddress, asPrivateKey, signedJointLedgerCommitments } = scenarios;
const {
  signedCommitment0,
  signedCommitment1,
  signedCommitment2,
  signedCommitment3,
  signedCommitment4,
  signedCommitment5,
} = signedJointLedgerCommitments;

const props = {
  processId,
  channelId,
};

const propsA = {
  ...props,
  ourIndex: ThreePartyPlayerIndex.A,
};

const propsB = {
  ...props,
  ourIndex: ThreePartyPlayerIndex.B,
};

// ----
// States
// ------
const commitmentSentA = states.commitmentSent(propsA);

const notSafeToSendB = states.notSafeToSend(propsB);
const commitmentSentB = states.commitmentSent(propsB);

// -------
// Shared Data
// -------

const emptySharedData = { ...EMPTY_SHARED_DATA };
// const channelCreated = { ...EMPTY_SHARED_DATA };
const aSentPreFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([signedCommitment0], asAddress, asPrivateKey),
]);

const bHasTwoPreFundCommitments = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([signedCommitment0, signedCommitment1], asAddress, asPrivateKey),
]);

const aSentPostFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([signedCommitment1, signedCommitment2], asAddress, asPrivateKey),
]);

const bHasTwoPostFundCommitments = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([signedCommitment2, signedCommitment3], asAddress, asPrivateKey),
]);

// -------
// Actions
// -------

const action: any = '';
const aReceivesPreFundSetup = commitmentsReceived({
  processId,
  signedCommitments: [signedCommitment0, signedCommitment1, signedCommitment2],
});
const aReceivesPostFundSetup = commitmentsReceived({
  processId,
  signedCommitments: [signedCommitment3, signedCommitment4, signedCommitment5],
});

const bReceivesPreFundSetup = commitmentsReceived({
  processId,
  signedCommitments: [signedCommitment0],
});
const bReceivesPostFundSetup = commitmentsReceived({
  processId,
  signedCommitments: [signedCommitment1, signedCommitment2, signedCommitment3],
});

// ---------
// Scenarios
// ---------

export const newChannelAsA = {
  ...propsA,
  commitmentSent: {
    state: commitmentSentA,
    sharedData: aSentPreFundCommitment,
    action: aReceivesPreFundSetup,
  },
};

export const existingChannelAsA = {
  ...propsA,
  commitmentSent: {
    state: commitmentSentA,
    sharedData: aSentPostFundCommitment,
    action: aReceivesPostFundSetup,
  },
};

export const newChannelAsB = {
  ...propsB,
  notSafeToSend: {
    state: notSafeToSendB,
    sharedData: emptySharedData,
    action: bReceivesPreFundSetup,
  },
  commitmentSent: {
    state: commitmentSentB,
    sharedData: bHasTwoPreFundCommitments,
    action,
  },
};

export const existingChannelAsB = {
  ...propsB,

  notSafeToSend: {
    state: notSafeToSendB,
    sharedData: bHasTwoPreFundCommitments,
    action: bReceivesPostFundSetup,
  },
  commitmentSent: {
    state: commitmentSentB,
    sharedData: bHasTwoPostFundCommitments,
    action,
  },
};
