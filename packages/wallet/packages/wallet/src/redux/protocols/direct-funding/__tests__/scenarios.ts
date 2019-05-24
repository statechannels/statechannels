import { addHex } from '../../../../utils/hex-utils';
import * as globalActions from '../../../actions';

import * as globalTestScenarios from '../../../__tests__/test-scenarios';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as testScenarios from '../../../__tests__/test-scenarios';
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
    testScenarios.signedCommitment0,
    testScenarios.signedCommitment1,
    globalTestScenarios.asAddress,
    globalTestScenarios.asPrivateKey,
  ),
]);

const bHasBothPrefundsSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    testScenarios.signedCommitment0,
    testScenarios.signedCommitment1,
    globalTestScenarios.bsAddress,
    globalTestScenarios.bsPrivateKey,
  ),
]);

const aHasPostFund0SharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments(
    testScenarios.signedCommitment1,
    testScenarios.signedCommitment2,
    globalTestScenarios.bsAddress,
    globalTestScenarios.bsPrivateKey,
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
const aFundingReceivedEvent = globalActions.fundingReceivedEvent(
  processId,
  channelId,
  YOUR_DEPOSIT_A,
  YOUR_DEPOSIT_A,
);
const bFundingReceivedEvent = globalActions.fundingReceivedEvent(
  processId,
  channelId,
  YOUR_DEPOSIT_B,
  TOTAL_REQUIRED,
);
const postFundSetup0 = globalActions.commitmentReceived(
  channelId,
  globalTestScenarios.signedCommitment2,
);
const postFundSetup1 = globalActions.commitmentReceived(
  channelId,
  globalTestScenarios.signedCommitment3,
);

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
