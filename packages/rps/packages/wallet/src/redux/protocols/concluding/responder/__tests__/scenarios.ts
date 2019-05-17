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
import { appCommitment } from '../../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { bsPrivateKey } from '../../../../../communication/__tests__/commitments';
import {
  ledgerUpdate0Received,
  ledger4,
  ledger5,
  ledger7,
  app10,
  app11,
  setFundingState as setFundingStateAlt,
} from '../../../indirect-defunding/__tests__/scenarios';

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
  channelFromCommitments(app50, app51, bsAddress, bsPrivateKey),
]);
const initialStoreYourTurn = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app51, app52, bsAddress, bsPrivateKey),
]);
const firstConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app51, app52, bsAddress, bsPrivateKey),
]);
const secondConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(app52, app53, bsAddress, bsPrivateKey),
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
const approveConcluding = states.approveConcluding(defaults);
const decideDefund = states.decideDefund(defaults);

const waitForDefund = states.waitForDefund({
  ...defaults,
  defundingState: preSuccessState,
});

const waitForDefundPreFailure = states.waitForDefund({
  ...defaults,
  defundingState: preFailureState,
});
const acknowledgeSuccess = states.acknowledgeSuccess(defaults);

// -------
// Actions
// -------
const concludeSent = actions.concludeApproved(processId);
const defundChosen = actions.defundChosen(processId);
const acknowledged = actions.acknowledged(processId);

// -------
// Scenarios
// -------
export const happyPath = {
  ...defaults,
  initialize: { store: initialStore, commitment: app52 },
  approveConcluding: {
    state: approveConcluding,
    store: firstConcludeReceived,
    action: concludeSent,
    reply: app53.commitment,
  },
  decideDefund: { state: decideDefund, store: secondConcludeReceived, action: defundChosen },
  waitForDefund: { state: waitForDefund, store: secondConcludeReceived, action: successTrigger },
  acknowledgeSuccess: {
    state: acknowledgeSuccess,
    store: secondConcludeReceived,
    action: acknowledged,
  },
};

export const happyPathAlternative = {
  ...defaults,

  decideDefund: {
    state: decideDefund,
    store: setFundingStateAlt(
      setChannels(EMPTY_SHARED_DATA, [
        channelFromCommitments(app10, app11, bsAddress, bsPrivateKey),
        channelFromCommitments(ledger4, ledger5, bsAddress, bsPrivateKey),
      ]),
    ),
    action: ledgerUpdate0Received,
    reply: ledger7,
  },
};

export const channelDoesntExist = {
  ...defaults,
  initialize: { channelId, store: setChannels(EMPTY_SHARED_DATA, []), commitment: app52 },
  acknowledgeFailure: {
    state: states.acknowledgeFailure({ ...defaults, reason: 'ChannelDoesntExist' }),
    store: initialStore,
    action: acknowledged,
  },
};

export const concludingNotPossible = {
  ...defaults,
  initialize: { store: initialStoreYourTurn, commitment: app53 },
  acknowledgeFailure: {
    state: states.acknowledgeFailure({ ...defaults, reason: 'NotYourTurn' }),
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
    state: states.acknowledgeFailure({ ...defaults, reason: 'DefundFailed' }),
    store: initialStore,
    action: acknowledged,
  },
};
