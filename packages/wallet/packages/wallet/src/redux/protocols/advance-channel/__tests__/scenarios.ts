import * as states from '../states';
import { ThreePartyPlayerIndex as PlayerIndex } from '../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import * as scenarios from '../../../../domain/commitments/__tests__';
import { commitmentsReceived, EmbeddedProtocol } from '../../../../communication';
import { CommitmentType } from '../../../../domain';
import { clearedToSend } from '../actions';
import { bigNumberify } from 'ethers/utils';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../../constants';
import { makeLocator } from '../..';

// ---------
// Test data
// ---------

const processId = 'Process.123';
const allocation = [
  bigNumberify(2).toHexString(),
  bigNumberify(3).toHexString(),
  bigNumberify(2).toHexString(),
];
const channelType = CONSENSUS_LIBRARY_ADDRESS;
const channelId = scenarios.threeWayLedgerId;
const {
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  hubAddress,
  hubPrivateKey,
  threeParticipants: destination,
} = scenarios;

const signedCommitment0 = scenarios.threeWayLedgerCommitment({ turnNum: 0 });
const signedCommitment1 = scenarios.threeWayLedgerCommitment({ turnNum: 1 });
const signedCommitment2 = scenarios.threeWayLedgerCommitment({ turnNum: 2 });
const signedCommitment3 = scenarios.threeWayLedgerCommitment({ turnNum: 3 });
const signedCommitment4 = scenarios.threeWayLedgerCommitment({ turnNum: 4 });
const signedCommitment5 = scenarios.threeWayLedgerCommitment({ turnNum: 5 });
const signedCommitment6 = scenarios.threeWayLedgerCommitment({
  turnNum: 6,
  isFinal: true,
  commitmentCount: 0,
});
const signedCommitment7 = scenarios.threeWayLedgerCommitment({
  turnNum: 7,
  isFinal: true,
  commitmentCount: 1,
});
const signedCommitment8 = scenarios.threeWayLedgerCommitment({
  turnNum: 8,
  isFinal: true,
  commitmentCount: 2,
});
const appAttributes = signedCommitment0.commitment.appAttributes;
const participants = signedCommitment0.commitment.channel.participants;

const initializeArgs = {
  allocation,
  destination,
  participants,
  channelType,
  appAttributes,
  processId,
  clearedToSend: true,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel),
};

const props = {
  ...initializeArgs,
  channelId,
};

const propsA = {
  ...props,
  ourIndex: PlayerIndex.A,
};

const propsB = {
  ...props,
  ourIndex: PlayerIndex.B,
  privateKey: bsPrivateKey,
};

const propsHub = {
  ...props,
  ourIndex: PlayerIndex.Hub,
  privateKey: hubPrivateKey,
};

const commitments0 = [signedCommitment0];
const commitments1 = [signedCommitment0, signedCommitment1];
const commitments2 = [signedCommitment0, signedCommitment1, signedCommitment2];
const commitments3 = [signedCommitment1, signedCommitment2, signedCommitment3];
const commitments4 = [signedCommitment2, signedCommitment3, signedCommitment4];
const commitments5 = [signedCommitment3, signedCommitment4, signedCommitment5];
const commitments6 = [signedCommitment4, signedCommitment5, signedCommitment6];
const commitments7 = [signedCommitment5, signedCommitment6, signedCommitment7];
const commitments8 = [signedCommitment6, signedCommitment7, signedCommitment8];

// ----
// States
// ------
const notSafeToSendA = states.notSafeToSend({
  ...propsA,
  commitmentType: CommitmentType.PostFundSetup,
});
const commitmentSentA = states.commitmentSent({
  ...propsA,
  commitmentType: CommitmentType.PreFundSetup,
});
const concludeCommitmentSentA = states.commitmentSent({
  ...propsA,
  commitmentType: CommitmentType.Conclude,
});
const postFundCommitmentSentA = states.commitmentSent({
  ...propsA,
  commitmentType: CommitmentType.PostFundSetup,
});

const channelUnknownB = states.channelUnknown({
  ...propsB,
  commitmentType: CommitmentType.PreFundSetup,
});
const notSafeToSendB = states.notSafeToSend({
  ...propsB,
  commitmentType: CommitmentType.PreFundSetup,
});
const commitmentSentB = states.commitmentSent({
  ...propsB,
  commitmentType: CommitmentType.PreFundSetup,
});

const channelUnknownHub = states.channelUnknown({
  ...propsHub,
  commitmentType: CommitmentType.PreFundSetup,
});
const notSafeToSendHub = states.notSafeToSend({
  ...propsHub,
  commitmentType: CommitmentType.PreFundSetup,
});

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

const aReceivedPrefundSetup = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments2, asAddress, asPrivateKey),
]);
const aSentPostFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments3, asAddress, asPrivateKey),
]);

const bSentPostFundSetupCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments4, bsAddress, bsPrivateKey),
]);

const aAllPostFundSetupsReceived = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments5, asAddress, asPrivateKey),
]);

const aSentConclude = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(commitments6, asAddress, asPrivateKey),
]);

// -------
// Actions
// -------

const args = {
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel),
};

const receivePreFundSetupFromA = commitmentsReceived({
  ...args,
  signedCommitments: commitments0,
});
const receivePreFundSetupFromB = commitmentsReceived({
  ...args,
  signedCommitments: commitments1,
});
const receivePreFundSetupFromHub = commitmentsReceived({
  ...args,
  signedCommitments: commitments2,
});

const receivePostFundSetupFromA = commitmentsReceived({
  ...args,
  signedCommitments: commitments3,
});
const receivePostFundSetupFromB = commitmentsReceived({
  ...args,
  signedCommitments: commitments4,
});
const receivePostFundSetupFromHub = commitmentsReceived({
  ...args,
  signedCommitments: commitments5,
});

const receiveConcludeFromB = commitmentsReceived({
  ...args,
  signedCommitments: commitments7,
});
const receiveConcludeFromHub = commitmentsReceived({
  ...args,
  signedCommitments: commitments8,
});
const clearSending = clearedToSend({
  processId,
  protocolLocator: [],
});
// ---------
// Scenarios
// ---------
const initializeArgsA = {
  ...initializeArgs,
  address: asAddress,
  privateKey: asPrivateKey,
  ourIndex: PlayerIndex.A,
  commitmentType: CommitmentType.PreFundSetup,
};

const initializeArgsB = {
  ...initializeArgs,
  address: bsAddress,
  privateKey: bsPrivateKey,
  ourIndex: PlayerIndex.B,
  commitmentType: CommitmentType.PreFundSetup,
};

const initializeArgsHub = {
  ...initializeArgs,
  address: hubAddress,
  privateKey: hubPrivateKey,
  ourIndex: PlayerIndex.Hub,
  commitmentType: CommitmentType.PreFundSetup,
};

const existingArgs = {
  clearedToSend: true,
  channelId,
  processId,
  commitmentType: CommitmentType.PostFundSetup,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel),
};

const existingArgsA = { ...existingArgs, ourIndex: PlayerIndex.A };
const existingArgsB = { ...existingArgs, ourIndex: PlayerIndex.B };
const existingArgsHub = { ...existingArgs, ourIndex: PlayerIndex.Hub };

export const initialized = {
  ...propsA,
  state: commitmentSentA,
  sharedData: aSentPreFundCommitment,
  trigger: receivePreFundSetupFromHub,
};

export const preFund = {
  preSuccess: {
    ...propsA,
    state: commitmentSentA,
    sharedData: aSentPreFundCommitment,
    trigger: receivePreFundSetupFromHub,
  },
  success: {
    ...propsA,
    state: states.success({
      commitmentType: CommitmentType.PreFundSetup,
      channelId,
    }),
    sharedData: aReceivedPrefundSetup,
  },
};
export const postFund = {
  preSuccess: {
    ...propsA,
    state: postFundCommitmentSentA,
    sharedData: aSentPostFundCommitment,
    trigger: receivePostFundSetupFromHub,
  },
  success: {
    ...propsA,
    state: states.success({
      commitmentType: CommitmentType.PreFundSetup,
      channelId,
    }),
    sharedData: aReceivedPrefundSetup,
  },
};

export const newChannelAsA = {
  ...propsA,
  initialize: {
    args: initializeArgsA,
    sharedData: emptySharedData,
    commitments: commitments0,
  },
  receiveFromB: {
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
  commitmentType: CommitmentType.PostFundSetup,
  initialize: {
    args: existingArgsA,
    sharedData: aReceivedPrefundSetup,
    commitments: commitments3,
  },
  receiveFromB: {
    state: { ...commitmentSentA, commitmentType: CommitmentType.PostFundSetup },
    sharedData: aSentPostFundCommitment,
    action: receivePostFundSetupFromB,
    commitments: commitments4,
  },
  receiveFromHub: {
    state: { ...commitmentSentA, commitmentType: CommitmentType.PostFundSetup },
    sharedData: aSentPostFundCommitment,
    action: receivePostFundSetupFromHub,
    commitments: commitments5,
  },
};

export const concludingA = {
  ...propsA,
  commitmentType: CommitmentType.Conclude,
  initialize: {
    args: { ...existingArgsA, commitmentType: CommitmentType.Conclude },
    sharedData: aAllPostFundSetupsReceived,
    commitments: commitments6,
  },
  receiveFromB: {
    state: concludeCommitmentSentA,
    sharedData: aSentConclude,
    action: receiveConcludeFromB,
    commitments: commitments7,
  },
  receiveFromHub: {
    state: concludeCommitmentSentA,
    sharedData: aSentConclude,
    action: receiveConcludeFromHub,
    commitments: commitments8,
  },
};

export const newChannelAsB = {
  ...propsB,
  initialize: {
    args: initializeArgsB,
    sharedData: emptySharedData,
  },
  receiveFromA: {
    state: channelUnknownB,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromA,
    commitments: commitments1,
  },
  receiveFromHub: {
    state: commitmentSentB,
    sharedData: bSentPreFundCommitment,
    action: receivePreFundSetupFromHub,
    commitments: commitments2,
  },
};

export const existingChannelAsB = {
  ...propsB,
  commitmentType: CommitmentType.PostFundSetup,
  initialize: {
    args: existingArgsB,
    sharedData: bReceivedPreFundSetup,
    commitments: commitments2,
  },
  receiveFromA: {
    state: { ...notSafeToSendB, commitmentType: CommitmentType.PostFundSetup },
    sharedData: bSentPreFundCommitment,
    action: receivePostFundSetupFromA,
    commitments: commitments4,
  },
  receiveFromHub: {
    state: { ...commitmentSentB, commitmentType: CommitmentType.PostFundSetup },
    sharedData: bSentPostFundSetupCommitment,
    action: receivePostFundSetupFromHub,
    commitments: commitments5,
  },
};

export const newChannelAsHub = {
  ...propsHub,
  initialize: {
    args: initializeArgsHub,
    sharedData: emptySharedData,
  },
  receiveFromA: {
    state: channelUnknownHub,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromA,
    commitments: commitments0,
  },
  receiveFromB: {
    state: channelUnknownHub,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromB,
    commitments: commitments2,
  },
};

export const existingChannelAsHub = {
  ...propsHub,
  commitmentType: CommitmentType.PostFundSetup,
  initialize: {
    args: existingArgsHub,
    sharedData: hubSentPreFundCommitment,
    commitments: commitments2,
  },
  receiveFromB: {
    state: { ...notSafeToSendHub, commitmentType: CommitmentType.PostFundSetup },
    sharedData: hubSentPreFundCommitment,
    action: receivePostFundSetupFromB,
    commitments: commitments5,
  },
};

export const notClearedToSend = {
  ...propsA,
  commitmentType: CommitmentType.PostFundSetup,
  initialize: {
    args: { ...existingArgsA, clearedToSend: false },
    sharedData: aReceivedPrefundSetup,
    commitments: commitments2,
  },
  clearedToSend: {
    state: {
      ...notSafeToSendA,
      commitmentType: CommitmentType.PostFundSetup,
      clearedToSend: false,
    },
    sharedData: aReceivedPrefundSetup,
    action: clearSending,
    commitments: commitments3,
  },
  clearedToSendButUnsafe: {
    state: {
      ...notSafeToSendB,
      commitmentType: CommitmentType.PostFundSetup,
      clearedToSend: false,
    },
    sharedData: bSentPreFundCommitment,
    action: clearSending,
    commitments: commitments1,
  },
  clearedToSendButChannelUnknown: {
    state: {
      ...channelUnknownB,
      commitmentType: CommitmentType.PreFundSetup,
      clearedToSend: false,
    },
    sharedData: emptySharedData,
    action: clearSending,
  },
  clearedToSendAndAlreadySent: {
    state: {
      ...commitmentSentB,
      commitmentType: CommitmentType.PreFundSetup,
      clearedToSend: true,
    },
    sharedData: bSentPreFundCommitment,
    action: clearSending,
    commitments: commitments1,
  },
};
