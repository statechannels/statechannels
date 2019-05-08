import * as states from '../states';
import {
  preSuccessState,
  preFailureState,
  successTrigger,
  failureTrigger,
} from '../../../defunding/__tests__';
import * as actions from '../actions';
import * as channelScenarios from '../../../../__tests__/test-scenarios';
import { CommitmentType, Commitment } from 'fmg-core';

// -----------------
// Channel Scenarios
// -----------------
const { channelId, bsAddress: address, bsPrivateKey: privateKey } = channelScenarios;
import { ChannelState } from '../../../../channel-store';
import { setChannel, EMPTY_SHARED_DATA } from '../../../../state';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';

const { signedCommitment20, signedCommitment21, signedCommitment22 } = channelScenarios;
const theirTurn = channelFromCommitments(
  signedCommitment20,
  signedCommitment21,
  address,
  privateKey,
);
const ourTurn = channelFromCommitments(signedCommitment21, signedCommitment22, address, privateKey);

const concludeCommitment: Commitment = {
  ...signedCommitment21.commitment,
  channel: channelScenarios.channel,
  commitmentCount: 0,
  commitmentType: CommitmentType.Conclude,
  appAttributes: '0x0',
  turnNum: 23,
};

// --------
// Defaults
// --------
const processId = 'processId';
const storage = (channelState: ChannelState) => setChannel(EMPTY_SHARED_DATA, channelState);

const defaults = { processId, channelId };

// ------
// States
// ------
const approveConcluding = states.approveConcluding(defaults);
const decideDefund = states.decideDefund(defaults);
const waitForDefund = states.waitForDefund({ ...defaults, defundingState: preSuccessState });
const waitForDefund2 = states.waitForDefund({ ...defaults, defundingState: preFailureState });
const acknowledgeSuccess = states.acknowledgeSuccess(defaults);
const success = states.success();

// -------
// Actions
// -------
const concludeSent = actions.concludeSent(processId);
const defundChosen = actions.defundChosen(processId);
const concludingImpossibleAcknowledged = actions.acknowledged(processId);
const acknowledged = actions.acknowledged(processId);

// -------
// Scenarios
// -------
export const happyPath = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    approveConcluding,
    decideDefund,
    waitForDefund,
    acknowledgeSuccess,
    success,
  },
  actions: {
    concludeSent,
    defundChosen,
    successTrigger,
    acknowledged,
  },
  commitments: {
    concludeCommitment,
  },
};

export const channelDoesntExist = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    acknowledgeFailure: states.acknowledgeFailure({ ...defaults, reason: 'ChannelDoesntExist' }),
    failure: states.failure({ reason: 'ChannelDoesntExist' }),
  },
  actions: {
    acknowledged,
  },
};

export const concludingNotPossible = {
  ...defaults,
  storage: storage(theirTurn),
  states: {
    acknowledgeFailure: states.acknowledgeFailure({ ...defaults, reason: 'NotYourTurn' }),
    failure: states.failure({ reason: 'NotYourTurn' }),
  },
  actions: {
    concludingImpossibleAcknowledged,
    acknowledged,
  },
};

export const defundingFailed = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    waitForDefund2,
    acknowledgeFailure: states.acknowledgeFailure({
      ...defaults,
      reason: 'DefundFailed',
    }),
    failure: states.failure({ reason: 'DefundFailed' }),
  },
  actions: {
    acknowledged,
    failureTrigger,
  },
};
