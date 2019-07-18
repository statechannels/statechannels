import { addHex } from '../../../../utils/hex-utils';
import * as globalActions from '../../../actions';

import * as scenarios from '../../../../domain/commitments/__tests__';
import * as transactionSubmissionScenarios from '../../transaction-submission/__tests__';
import * as advanceChannelScenarios from '../../advance-channel/__tests__';
import * as states from '../states';
import { directFundingRequested } from '../actions';
import { SharedData } from '../../../state';

const { threeWayLedgerId: channelId, twoThree } = scenarios;

export const YOUR_DEPOSIT_A = twoThree[0].wei;
export const YOUR_DEPOSIT_B = twoThree[1].wei;
export const TOTAL_REQUIRED = addHex(twoThree[0].wei, twoThree[1].wei);
const processId = `processId.${channelId}`;

// shared data

// Direct funding state machine states
const defaultsForA: states.DirectFundingState = {
  processId,
  totalFundingRequired: TOTAL_REQUIRED,
  requiredDeposit: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: '0x',
  type: 'DirectFunding.NotSafeToDeposit',
};

const defaultsForB: states.DirectFundingState = {
  ...defaultsForA,
  requiredDeposit: YOUR_DEPOSIT_B,
  ourIndex: 1,
  safeToDepositLevel: YOUR_DEPOSIT_A,
};

// actions
const aInitializeAction = directFundingRequested({ ...defaultsForA });
const aInitializeWithNoDeposit = directFundingRequested({
  ...defaultsForA,

  requiredDeposit: '0x0',
});

const aInitializeWithRequiredDeposit = directFundingRequested({
  ...defaultsForA,

  requiredDeposit: '0x5',
});
const bInitializeAction = directFundingRequested({ ...defaultsForB });
const aFundingReceivedEvent = globalActions.fundingReceivedEvent({
  processId,
  channelId,
  amount: YOUR_DEPOSIT_A,
  totalForDestination: YOUR_DEPOSIT_A,
});
const bFundingReceivedEvent = globalActions.fundingReceivedEvent({
  processId,
  channelId,
  amount: YOUR_DEPOSIT_B,
  totalForDestination: TOTAL_REQUIRED,
});

const sharedData = () => ({ ...advanceChannelScenarios.preSuccess.sharedData });

const adjudicatorStateSharedData: SharedData = {
  ...sharedData(),
  adjudicatorState: { [channelId]: { channelId, balance: '0x5', finalized: false } },
};
export const aHappyPath = {
  initialize: { sharedData: sharedData(), action: aInitializeAction },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    sharedData: sharedData(),
    action: transactionSubmissionScenarios.successTrigger,
  },

  waitForFunding: {
    state: states.waitForFunding(defaultsForA),
    sharedData: sharedData(),
    action: bFundingReceivedEvent,
  },
};

export const bHappyPath = {
  initialize: { sharedData: sharedData(), action: bInitializeAction },
  notSafeToDeposit: {
    state: states.notSafeToDeposit(defaultsForB),
    action: aFundingReceivedEvent,
    sharedData: sharedData(),
  },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForB,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    sharedData: sharedData(),
    action: transactionSubmissionScenarios.successTrigger,
  },
  waitForFunding: {
    state: states.waitForFunding(defaultsForB),
    sharedData: sharedData(),
    action: bFundingReceivedEvent,
  },
};

export const depositNotRequired = {
  initialize: { action: aInitializeWithNoDeposit, sharedData: sharedData() },
};
export const existingOnChainDeposit = {
  initialize: { action: aInitializeWithRequiredDeposit, sharedData: adjudicatorStateSharedData },
};

export const transactionFails = {
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preFailureState,
    }),
    sharedData: sharedData(),

    action: transactionSubmissionScenarios.failureTrigger,
  },
};
