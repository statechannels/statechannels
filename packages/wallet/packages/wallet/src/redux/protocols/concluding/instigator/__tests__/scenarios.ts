import * as states from '../../state';

import {
  preSuccessState,
  successTrigger,
  preFailureState,
  failureTrigger,
} from '../../../defunding/__tests__';
import * as actions from '../actions';
import * as channelScenarios from '../../../../__tests__/test-scenarios';
import { EMPTY_SHARED_DATA, setChannels, setFundingState } from '../../../../state';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import { appCommitment, asPrivateKey } from '../../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { commitmentReceived } from '../../../../actions';

// -----------------
// Channel Scenarios
// -----------------
const { channelId, bsAddress, asAddress } = channelScenarios;

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const app50 = appCommitment({ turnNum: 50, balances: twoThree, isFinal: false });
const app51 = appCommitment({ turnNum: 51, balances: twoThree, isFinal: false });
const app52 = appCommitment({ turnNum: 52, balances: twoThree, isFinal: true });
const app53 = appCommitment({ turnNum: 53, balances: twoThree, isFinal: true });

const initialStore = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app50, app51, asAddress, asPrivateKey),
]);

const firstConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app51, app52, asAddress, asPrivateKey),
]);
const secondConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app52, app53, asAddress, asPrivateKey),
]);

const firstConcludeReceived = setFundingState(firstConcludeReceivedChannelState, channelId, {
  directlyFunded: true,
});
const secondConcludeReceived = setFundingState(secondConcludeReceivedChannelState, channelId, {
  directlyFunded: true,
});
// --------
// Defaults
// --------
const processId = 'processId';

const defaults = { processId, channelId };

// ------
// States
// ------
const approveConcluding = states.instigatorApproveConcluding(defaults);
const waitForDefund = states.instigatorWaitForDefund({
  ...defaults,
  defundingState: preSuccessState,
});
const waitForDefundPreFailure = states.instigatorWaitForDefund({
  ...defaults,
  defundingState: preFailureState,
});

const acknowledgeSuccess = states.instigatorAcknowledgeSuccess(defaults);
const waitforOpponentConclude = states.instigatorWaitForOpponentConclude(defaults);
const acknowledgeConcludeReceived = states.instigatorAcknowledgeConcludeReceived(defaults);

// -------
// Actions
// -------
const concludeSent = actions.concludeApproved(processId);
const acknowledged = actions.acknowledged(processId);
const commitmentReceivedAction = commitmentReceived(processId, app53);
const defundChosen = actions.defundChosen(processId);
const cancelled = actions.cancelled(processId);

// -------
// Scenarios
// -------
export const happyPath = {
  ...defaults,
  initialize: { channelId, store: initialStore },
  approveConcluding: {
    state: approveConcluding,
    store: initialStore,
    action: concludeSent,
    reply: app52.commitment,
  },
  waitforOpponentConclude: {
    state: waitforOpponentConclude,
    store: firstConcludeReceived,
    action: commitmentReceivedAction,
  },
  acknowledgeConcludeReceived: {
    state: acknowledgeConcludeReceived,
    store: secondConcludeReceived,
    action: defundChosen,
  },
  waitForDefund: { state: waitForDefund, store: secondConcludeReceived, action: successTrigger },
  acknowledgeSuccess: {
    state: acknowledgeSuccess,
    store: secondConcludeReceived,
    action: acknowledged,
  },
};

export const channelDoesntExist = {
  ...defaults,
  initialize: { channelId, store: setChannels(EMPTY_SHARED_DATA, []) },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'ChannelDoesntExist' }),
    store: initialStore,
    action: acknowledged,
  },
};

export const concludingNotPossible = {
  ...defaults,
  initialize: { channelId, store: firstConcludeReceived },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'NotYourTurn' }),
    store: initialStore,
    action: acknowledged,
  },
};

export const concludingCancelled = {
  ...defaults,
  initialize: { channelId, store: firstConcludeReceived },
  approveConcluding: {
    state: approveConcluding,
    store: initialStore,
    action: cancelled,
  },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'ConcludeCancelled' }),
    store: initialStore,
    action: acknowledged,
  },
};

export const defundFailed = {
  ...defaults,
  waitForDefund: {
    state: waitForDefundPreFailure,
    store: initialStore,
    action: failureTrigger,
  },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'DefundFailed' }),
    store: initialStore,
    action: acknowledged,
  },
};
