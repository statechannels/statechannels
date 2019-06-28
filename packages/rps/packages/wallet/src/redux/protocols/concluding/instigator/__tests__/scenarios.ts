import * as states from '../../states';

import * as actions from '../actions';
import * as channelScenarios from '../../../../__tests__/test-scenarios';
import { EMPTY_SHARED_DATA, setChannels, setFundingState } from '../../../../state';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import {
  appCommitment,
  asPrivateKey,
  ledgerId,
  ledgerCommitment,
} from '../../../../../domain/commitments/__tests__';
import { bigNumberify } from 'ethers/utils';
import { commitmentReceived } from '../../../../actions';
import { twoPlayerPreSuccessA } from '../../../consensus-update/__tests__';
import { keepLedgerChannelApproved } from '../../../../../communication';

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
const ledger4 = ledgerCommitment({ turnNum: 4, balances: twoThree });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: twoThree });
// --------
// Defaults
// --------
const processId = 'processId';

const defaults = { processId, channelId };

// ------
// States
// ------
const approveConcluding = states.instigatorApproveConcluding(defaults);

const acknowledgeSuccess = states.instigatorAcknowledgeSuccess(defaults);
const waitforOpponentConclude = states.instigatorWaitForOpponentConclude(defaults);
const acknowledgeConcludeReceived = states.instigatorAcknowledgeConcludeReceived({
  ...defaults,
  opponentSelectedKeepLedgerChannel: false,
});
const waitForLedgerUpdate = states.instigatorWaitForLedgerUpdate({
  ...defaults,
  consensusUpdateState: twoPlayerPreSuccessA.state,
});
const waitForOpponentResponse = states.instigatorWaitForOpponentSelection(defaults);
// -------
// Shared Data
// -------
const initialStore = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app50, app51], asAddress, asPrivateKey),
]);

const firstConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app51, app52], asAddress, asPrivateKey),
]);
const secondConcludeReceivedChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app52, app53], asAddress, asPrivateKey),
]);
const secondConcludeReceivedWithLedgerChannelChannelState = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app52, app53], asAddress, asPrivateKey),
  channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
]);

const firstConcludeReceived = setFundingState(firstConcludeReceivedChannelState, channelId, {
  directlyFunded: true,
});
const secondConcludeReceived = setFundingState(secondConcludeReceivedChannelState, channelId, {
  directlyFunded: true,
});

const indirectFundedSecondConcludeReceived = {
  ...setFundingState(secondConcludeReceivedWithLedgerChannelChannelState, channelId, {
    directlyFunded: false,
    fundingChannel: ledgerId,
  }),
};

// -------
// Actions
// -------
const concludeSent = actions.concludeApproved({ processId });
const acknowledged = actions.acknowledged({ processId });
const commitmentReceivedAction = commitmentReceived({ processId, signedCommitment: app53 });
const defundChosen = actions.defundChosen({ processId });
const keepOpenChosen = actions.keepOpenChosen({ processId });
const cancelled = actions.cancelled({ processId });
const opponentSelectedKeepOpen = keepLedgerChannelApproved({ processId });

// -------
// Scenarios
// -------
export const happyPath = {
  ...defaults,
  initialize: { channelId, sharedData: initialStore },
  approveConcluding: {
    state: approveConcluding,
    sharedData: initialStore,
    action: concludeSent,
    reply: app52.commitment,
  },
  waitForOpponentConclude: {
    state: waitforOpponentConclude,
    sharedData: firstConcludeReceived,
    action: commitmentReceivedAction,
  },
  acknowledgeConcludeReceived: {
    state: acknowledgeConcludeReceived,
    sharedData: secondConcludeReceived,
    action: defundChosen,
  },
};

export const noDefundingHappyPath = {
  ...defaults,
  initialize: { channelId, sharedData: initialStore },
  approveConcluding: {
    state: approveConcluding,
    sharedData: initialStore,
    action: concludeSent,
    reply: app52.commitment,
  },
  waitforOpponentConclude: {
    state: waitforOpponentConclude,
    sharedData: firstConcludeReceived,
    action: commitmentReceivedAction,
  },
  acknowledgeConcludeReceived: {
    state: acknowledgeConcludeReceived,
    sharedData: indirectFundedSecondConcludeReceived,
    action: keepOpenChosen,
  },
  waitForOpponentResponse: {
    state: waitForOpponentResponse,
    sharedData: indirectFundedSecondConcludeReceived,
    action: opponentSelectedKeepOpen,
  },
  waitForLedgerUpdate: {
    state: waitForLedgerUpdate,
    sharedData: twoPlayerPreSuccessA.sharedData,
    action: twoPlayerPreSuccessA.action,
  },
  acknowledgeSuccess: {
    state: acknowledgeSuccess,
    sharedData: secondConcludeReceived,
    action: acknowledged,
  },
};

export const channelDoesntExist = {
  ...defaults,
  initialize: { channelId, sharedData: setChannels(EMPTY_SHARED_DATA, []) },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'ChannelDoesntExist' }),
    sharedData: initialStore,
    action: acknowledged,
  },
};

export const concludingNotPossible = {
  ...defaults,
  initialize: { channelId, sharedData: firstConcludeReceived },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'NotYourTurn' }),
    sharedData: initialStore,
    action: acknowledged,
  },
};

export const concludingCancelled = {
  ...defaults,
  initialize: { channelId, sharedData: firstConcludeReceived },
  approveConcluding: {
    state: approveConcluding,
    sharedData: initialStore,
    action: cancelled,
  },
  acknowledgeFailure: {
    state: states.instigatorAcknowledgeFailure({ ...defaults, reason: 'ConcludeCancelled' }),
    sharedData: initialStore,
    action: acknowledged,
  },
};
