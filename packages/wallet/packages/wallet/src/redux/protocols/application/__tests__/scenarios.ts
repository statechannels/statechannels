import * as states from '../states';
import * as channelScenarios from '../../../__tests__/test-scenarios';
import * as protocolActions from '../../actions';
import * as actions from '../actions';

// -----------------
// Channel Scenarios
// -----------------
const { channelId, asAddress: address, asPrivateKey: privateKey } = channelScenarios;
import { ChannelState } from '../../../channel-store';
import { setChannel, EMPTY_SHARED_DATA } from '../../../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { APPLICATION_PROCESS_ID } from '../reducer';

const {
  signedCommitment19,
  signedCommitment20,
  signedCommitment21,
  signedCommitment22,
  preFundCommitment0,
} = channelScenarios;
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
const addressKnown = states.addressKnown(address, privateKey);
const ongoing = states.ongoing(channelId);
const success = states.success();

// -------
// Actions
// -------
const initializeChannel = protocolActions.initializeChannel();
const receivePreFundSetup = actions.ownCommitmentReceived(processId, preFundCommitment0);
const receiveOurCommitment = actions.ownCommitmentReceived(
  processId,
  signedCommitment22.commitment,
);
const { commitment, signature } = signedCommitment21;
const receiveTheirCommitment = actions.opponentCommitmentReceived(processId, commitment, signature);

const receiveTheirInvalidCommitment = actions.opponentCommitmentReceived(
  processId,
  signedCommitment19.commitment,
  signedCommitment19.signature,
);
const receiveOurInvalidCommitment = actions.ownCommitmentReceived(
  processId,
  signedCommitment20.commitment,
);

const concludeRequested = actions.concludeRequested(APPLICATION_PROCESS_ID);
// -------
// Scenarios
// -------
export const initializingApplication = {
  ...defaults,
  storage: { ...EMPTY_SHARED_DATA },
  actions: {
    initializeChannel,
  },
};

export const startingApplication = {
  ...defaults,
  storage: { ...EMPTY_SHARED_DATA },
  states: {
    addressKnown,
  },
  actions: {
    receivePreFundSetup,
  },
};

export const receivingACloseRequest = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    ongoing,
    success,
  },
  actions: {
    concludeRequested,
  },
};

export const receivingOurCommitment = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    ongoing,
  },
  actions: {
    receiveOurCommitment,
  },
};

export const receivingTheirCommitment = {
  ...defaults,
  storage: storage(theirTurn),
  states: {
    ongoing,
  },
  actions: {
    receiveTheirCommitment,
  },
};

export const receivingTheirInvalidCommitment = {
  ...defaults,
  storage: storage(theirTurn),
  states: {
    ongoing,
  },
  actions: {
    receiveTheirInvalidCommitment,
  },
};

export const receivingOurInvalidCommitment = {
  ...defaults,
  storage: storage(ourTurn),
  states: {
    ongoing,
  },
  actions: {
    receiveOurInvalidCommitment,
  },
};
