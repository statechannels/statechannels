import * as states from '../states';
import * as actions from '../actions';
import * as channelScenarios from '../../../__tests__/test-scenarios';

// -----------------
// Channel Scenarios
// -----------------
const { channelId, asAddress: address, asPrivateKey: privateKey } = channelScenarios;
import { ChannelState } from '../../../channel-store';
import { setChannel, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';

const { signedCommitment19, signedCommitment20, signedCommitment21 } = channelScenarios;
const theirTurn = channelFromCommitments(
  signedCommitment19,
  signedCommitment20,
  address,
  privateKey,
);
const ourTurn = channelFromCommitments(signedCommitment20, signedCommitment21, address, privateKey);

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
const waitForOpponentConclude = states.waitForOpponentConclude(defaults);
const acknowledgeChannelConcluded = states.acknowledgeChannelConcluded(defaults);
const waitForDefund = states.waitForDefund(defaults);
const success = states.success();
const acknowledgeConcludingImpossible = states.acknowledgeConcludingImpossible(defaults);
const acknowledgeChannelDoesntExist = states.acknowledgeChannelDoesntExist(defaults);
const acknowledgeDefundFailed = states.acknowledgeDefundFailed(defaults);

// -------
// Actions
// -------
const concludeSent = actions.concludeSent(processId);
const concludeReceived = actions.concludeReceived(processId);
const defundChosen = actions.defundChosen(processId);
const defunded = actions.defunded(processId);
const concludingImpossibleAcknowledged = actions.resignationImpossibleAcknowledged(processId);
const defundFailed = actions.defundFailed(processId);
const cancelled = actions.cancelled(processId);
const acknowledged = actions.acknowledged(processId);

// -------
// Scenarios
// -------
export const happyPath = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    approveConcluding,
    waitForOpponentConclude,
    acknowledgeChannelConcluded,
    waitForDefund,
    success,
  },
  actions: {
    concludeSent,
    concludeReceived,
    defundChosen,
    defunded,
  },
};

export const channelDoesntExist = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    acknowledgeChannelDoesntExist,
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
    acknowledgeConcludingImpossible,
    failure: states.failure({ reason: 'NotYourTurn' }),
  },
  actions: {
    concludingImpossibleAcknowledged,
  },
};

export const concludingCancelled = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    approveConcluding,
    failure: states.failure({ reason: 'ConcludeCancelled' }),
  },
  actions: {
    cancelled,
  },
};

export const defundingFailed = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    waitForDefund,
    acknowledgeDefundFailed,
    failure: states.failure({ reason: 'DefundFailed' }),
  },
  actions: {
    defundFailed,
    acknowledged,
  },
};
