import { addHex } from '../../../../utils/hex-utils';
import * as globalActions from '../../../actions';

import * as scenarios from '../../../__tests__/test-scenarios';
import * as transactionSubmissionScenarios from '../../transaction-submission/__tests__';
import * as states from '../states';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { EMPTY_SHARED_DATA, setChannels } from '../../../state';
import { directFundingRequested } from '../actions';

const { channelId, twoThree } = scenarios;

export const YOUR_DEPOSIT_A = twoThree[0];
export const YOUR_DEPOSIT_B = twoThree[1];
export const TOTAL_REQUIRED = twoThree.reduce(addHex);
const processId = `processId.${channelId}`;

// shared data
const aHasBothPrefundsSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment0,
    scenarios.signedCommitment1,
    scenarios.asAddress,
    scenarios.asPrivateKey,
  ),
]);

const bHasBothPrefundsSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment0,
    scenarios.signedCommitment1,
    scenarios.bsAddress,
    scenarios.bsPrivateKey,
  ),
]);

const aHasPostFund0SharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    scenarios.signedCommitment1,
    scenarios.signedCommitment2,
    scenarios.bsAddress,
    scenarios.bsPrivateKey,
  ),
]);

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
const postFundSetup0 = globalActions.commitmentReceived({
  processId: channelId,
  signedCommitment: scenarios.signedCommitment2,
});
const postFundSetup1 = globalActions.commitmentReceived({
  processId: channelId,
  signedCommitment: scenarios.signedCommitment3,
});

export const aHappyPath = {
  initialize: { sharedData: aHasBothPrefundsSharedData, action: aInitializeAction },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    sharedData: aHasBothPrefundsSharedData,
    action: transactionSubmissionScenarios.successTrigger,
  },

  waitForFundingAndPostFundSetup: {
    state: states.waitForFundingAndPostFundSetup({
      ...defaultsForA,
      channelFunded: false,
      postFundSetupReceived: false,
    }),
    sharedData: aHasBothPrefundsSharedData,
    action: aFundingReceivedEvent,
  },
  waitForPostFundSetup: {
    state: states.waitForFundingAndPostFundSetup({
      ...defaultsForA,
      channelFunded: true,
      postFundSetupReceived: false,
    }),
    sharedData: aHasPostFund0SharedData,
    action: postFundSetup1,
  },
};

export const bHappyPath = {
  initialize: { sharedData: bHasBothPrefundsSharedData, action: bInitializeAction },
  notSafeToDeposit: {
    state: states.notSafeToDeposit(defaultsForB),
    action: aFundingReceivedEvent,
    sharedData: bHasBothPrefundsSharedData,
  },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForB,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    sharedData: bHasBothPrefundsSharedData,
    action: transactionSubmissionScenarios.successTrigger,
  },
  waitForFundingAndPostFundSetup: {
    state: states.waitForFundingAndPostFundSetup({
      ...defaultsForB,
      channelFunded: false,
      postFundSetupReceived: false,
    }),
    sharedData: bHasBothPrefundsSharedData,
    action: bFundingReceivedEvent,
  },
  waitForPostFundSetup: {
    state: states.waitForFundingAndPostFundSetup({
      ...defaultsForB,
      channelFunded: true,
      postFundSetupReceived: false,
    }),
    sharedData: bHasBothPrefundsSharedData,
    action: postFundSetup0,
  },
};

export const transactionFails = {
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preFailureState,
    }),
    sharedData: aHasBothPrefundsSharedData,

    action: transactionSubmissionScenarios.failureTrigger,
  },
};
