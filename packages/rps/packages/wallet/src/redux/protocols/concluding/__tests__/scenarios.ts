import * as states from '../states';
import * as actions from '../actions';
import * as channelScenarios from '../../../__tests__/test-scenarios';

// -----------------
// Channel Scenarios
// -----------------
const { channelId, libraryAddress, channelNonce, participants } = channelScenarios;
const channel = { channelId, libraryAddress, channelNonce, participants };
const { asAddress: address, asPrivateKey: privateKey } = channelScenarios;
const participant = { address, privateKey, ourIndex: 0 };
import { ChannelStatus, waitForUpdate } from '../../../channel-state/state';
const channelDefaults = { ...channel, ...participant };
import { setChannel, EMPTY_SHARED_DATA } from '../../../state';

const { signedCommitment19, signedCommitment20, signedCommitment21 } = channelScenarios;

const theirTurn = waitForUpdate({
  ...channelDefaults,
  turnNum: 20,
  lastCommitment: signedCommitment20,
  penultimateCommitment: signedCommitment19,
  funded: true,
});
const ourTurn = waitForUpdate({
  ...channelDefaults,
  turnNum: 21,
  lastCommitment: signedCommitment21,
  penultimateCommitment: signedCommitment20,
  funded: true,
});

// --------
// Defaults
// --------
const processId = 'processId';
const storage = (channelState: ChannelStatus) => setChannel(EMPTY_SHARED_DATA, channelState);

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
