import { addHex } from '../../../../utils/hex-utils';
import * as globalActions from '../../../actions';

import * as scenarios from '../../../../domain/commitments/__tests__';
import * as transactionSubmissionScenarios from '../../transaction-submission/__tests__';
import * as advanceChannelScenarios from '../../advance-channel/__tests__';
import * as states from '../states';
import { SharedData } from '../../../state';

const { threeWayLedgerId: channelId, twoThree } = scenarios;

export const YOUR_DEPOSIT_A = twoThree[0].wei;
export const YOUR_DEPOSIT_B = twoThree[1].wei;
export const TOTAL_REQUIRED = addHex(twoThree[0].wei, twoThree[1].wei);
const processId = `processId.${channelId}`;

// shared data

// Direct funding state machine states
const defaultsForA = {
  processId,
  totalFundingRequired: TOTAL_REQUIRED,
  requiredDeposit: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: '0x',
  type: 'DirectFunding.NotSafeToDeposit',
  protocolLocator: [],
  funded: false,
};

const defaultsForB = {
  ...defaultsForA,
  requiredDeposit: YOUR_DEPOSIT_B,
  ourIndex: 1,
  safeToDepositLevel: YOUR_DEPOSIT_A,
};

// actions

const aFundingReceivedEvent = globalActions.fundingReceivedEvent({
  processId,
  channelId,
  amount: YOUR_DEPOSIT_A,
  totalForDestination: YOUR_DEPOSIT_A,
  protocolLocator: [],
});
const bFundingReceivedEvent = globalActions.fundingReceivedEvent({
  processId,
  channelId,
  amount: YOUR_DEPOSIT_B,
  totalForDestination: TOTAL_REQUIRED,
  protocolLocator: [],
});

const sharedData = () => ({ ...advanceChannelScenarios.preSuccess.sharedData });

const adjudicatorStateSharedData: SharedData = {
  ...sharedData(),
  adjudicatorState: { [channelId]: { channelId, balance: '0x5', finalized: false } },
};
export const aHappyPath = {
  initialize: { ...defaultsForA, sharedData: sharedData() },
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
  initialize: { ...defaultsForB, sharedData: sharedData() },
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
  initialize: { ...defaultsForA, requiredDeposit: '0x0', sharedData: sharedData() },
};
export const existingOnChainDeposit = {
  initialize: {
    ...defaultsForA,
    requiredDeposit: '0x05',
    sharedData: adjudicatorStateSharedData,
  },
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

export const fundsReceivedArrivesEarly = {
  initialize: { ...defaultsForA, sharedData: sharedData() },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    sharedData: sharedData(),
    action: aFundingReceivedEvent,
  },
  waitForDepositTransactionFunded: {
    state: states.waitForDepositTransaction({
      ...defaultsForB,
      funded: true,
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
