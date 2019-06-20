import * as states from '../states';
import { ThreePartyPlayerIndex } from '../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as scenarios from '../../../__tests__/test-scenarios';
import { commitmentsReceived } from '../../../../communication';

// ---------
// Test data
// ---------
const processId = 'Process.123';
const {
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  hubAddress,
  hubPrivateKey,
  signedJointLedgerCommitments,
  threeParticipants,
  oneTwoThree,
  ledgerLibraryAddress,
  jointLedgerId: channelId,
} = scenarios;
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

const propsHub = {
  ...props,
  ourIndex: ThreePartyPlayerIndex.Hub,
};

const commitments0 = [signedCommitment0];
const commitments1 = [signedCommitment0, signedCommitment1];
const commitments2 = [signedCommitment0, signedCommitment1, signedCommitment2];
const commitments3 = [signedCommitment1, signedCommitment2, signedCommitment3];
const commitments4 = [signedCommitment2, signedCommitment3, signedCommitment4];
const commitments5 = [signedCommitment3, signedCommitment4, signedCommitment5];

// ----
// States
// ------
const commitmentSentA = states.commitmentSent(propsA);

const notSafeToSendB = states.notSafeToSend(propsB);
const commitmentSentB = states.commitmentSent(propsB);

const notSafeToSendHub = states.notSafeToSend(propsHub);

// -------
// Shared Data
// -------

const emptySharedData = { ...EMPTY_SHARED_DATA };
// const channelCreated = { ...EMPTY_SHARED_DATA };
const aSentPreFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments0, asAddress, asPrivateKey),
]);

const bSentPreFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments1, bsAddress, bsPrivateKey),
]);

const bReceivedPreFundSetup = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments2, bsAddress, bsPrivateKey),
]);

const hubSentPreFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments2, hubAddress, hubPrivateKey),
]);

const aSentPostFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments3, asAddress, asPrivateKey),
]);

const bSentPostFundSetupCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments4, bsAddress, bsPrivateKey),
]);

// -------
// Actions
// -------

const receivePreFundSetupFromA = commitmentsReceived({
  processId,
  signedCommitments: commitments0,
});
const receivePreFundSetupFromB = commitmentsReceived({
  processId,
  signedCommitments: commitments1,
});
const receivePreFundSetupFromHub = commitmentsReceived({
  processId,
  signedCommitments: commitments2,
});

const receivePostFundSetupFromA = commitmentsReceived({
  processId,
  signedCommitments: commitments3,
});
const receivePostFundSetupFromB = commitmentsReceived({
  processId,
  signedCommitments: commitments4,
});
const receivePostFundSetupFromHub = commitmentsReceived({
  processId,
  signedCommitments: commitments5,
});
// ---------
// Scenarios
// ---------
const args = {
  ourIndex: 0,
  allocation: oneTwoThree,
  destination: threeParticipants,
  channelType: ledgerLibraryAddress,
  appAttributes: scenarios.jointLedgerCommitments.postFundCommitment0.appAttributes,
  address: asAddress,
  privateKey: asPrivateKey,
};

export const newChannelAsA = {
  ...propsA,
  initialize: {
    args,
    sharedData: emptySharedData,
    commitments: commitments0,
  },
  receiveFromB: {
    args,
    state: commitmentSentA,
    sharedData: aSentPreFundCommitment,
    action: receivePreFundSetupFromB,
    commitments: commitments1,
  },
  receiveFromHub: {
    state: commitmentSentA,
    sharedData: aSentPreFundCommitment,
    action: receivePreFundSetupFromHub,
    commitments: commitments2,
  },
};

export const existingChannelAsA = {
  ...propsA,
  initialize: {
    args,
    sharedData: aSentPostFundCommitment,
    commitment: signedCommitment3,
  },
  receiveFromB: {
    state: commitmentSentA,
    sharedData: aSentPostFundCommitment,
    action: receivePostFundSetupFromB,
  },
  receiveFromHub: {
    state: commitmentSentA,
    sharedData: aSentPostFundCommitment,
    action: receivePostFundSetupFromHub,
  },
};

export const newChannelAsB = {
  ...propsB,
  initialize: {
    sharedData: emptySharedData,
  },
  receiveFromA: {
    state: notSafeToSendB,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromA,
    commitment: signedCommitment1,
  },
  receiveFromHub: {
    state: commitmentSentB,
    sharedData: bSentPreFundCommitment,
    action: receivePreFundSetupFromHub,
  },
};

export const existingChannelAsB = {
  ...propsB,
  initialize: {
    sharedData: bReceivedPreFundSetup,
  },
  receiveFromA: {
    state: notSafeToSendB,
    sharedData: bSentPreFundCommitment,
    action: receivePostFundSetupFromA,
    commitment: signedCommitment4,
  },
  receiveFromHub: {
    state: commitmentSentB,
    sharedData: bSentPostFundSetupCommitment,
    action: receivePostFundSetupFromA,
  },
};

export const newChannelAsHub = {
  ...propsHub,
  initialize: {
    sharedData: emptySharedData,
  },
  receiveFromB: {
    state: notSafeToSendHub,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromB,
    commitment: signedCommitment2,
  },
};

export const existingChannelAsHub = {
  ...propsHub,
  initialize: {
    sharedData: hubSentPreFundCommitment,
  },
  receiveFromB: {
    state: notSafeToSendHub,
    sharedData: hubSentPreFundCommitment,
    action: receivePostFundSetupFromB,
    commitment: signedCommitment5,
  },
};
