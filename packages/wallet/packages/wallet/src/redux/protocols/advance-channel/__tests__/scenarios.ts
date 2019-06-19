import * as states from '../states';
import { PlayerIndex } from '../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { channelId } from '../../../../domain/commitments/__tests__';
import {
  channelFromCommitments,
  partiallyOpenChannelFromCommitment,
} from '../../../channel-store/channel-state/__tests__';
import * as scenarios from '../../../__tests__/test-scenarios';

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

const props = {
  processId,
  channelId,
};

const propsA = {
  ...props,
  ourIndex: PlayerIndex.A,
};

const propsB = {
  ...props,
  ourIndex: PlayerIndex.B,
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
  partiallyOpenChannelFromCommitment(
    scenarios.signedCommitment0,
    scenarios.asAddress,
    scenarios.asPrivateKey,
  ),
]);

const bHasTwoPreFundCommitments = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment0,
    scenarios.signedCommitment1,
    scenarios.asAddress,
    scenarios.asPrivateKey,
  ),
]);

const aSentPostFundCommitment = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment1,
    scenarios.signedCommitment2,
    scenarios.asAddress,
    scenarios.asPrivateKey,
  ),
]);

const bHasTwoPostFundCommitments = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment2,
    scenarios.signedCommitment3,
    scenarios.asAddress,
    scenarios.asPrivateKey,
  ),
]);

// -------
// Actions
// -------

const action: any = '';

// ---------
// Scenarios
// ---------
export const newChannelAsA = {
  ...propsA,
  commitmentSent: {
    state: commitmentSentA,
    sharedData: aSentPreFundCommitment,
    action,
  },
};

export const existingChannelAsA = {
  ...propsA,
  commitmentSent: {
    state: commitmentSentA,
    sharedData: aSentPostFundCommitment,
    action,
  },
};

export const newChannelAsB = {
  ...propsB,
  notSafeToSend: {
    state: notSafeToSendB,
    sharedData: emptySharedData,
    action,
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
    action,
  },
  commitmentSent: {
    state: commitmentSentB,
    sharedData: bHasTwoPostFundCommitments,
    action,
  },
};
