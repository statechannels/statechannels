import { addHex } from '../../../../utils/hex-utils';
import * as globalActions from '../../../actions';
import * as channelStates from '../../../channel-store';
import { emptyDisplayOutboxState } from '../../../outbox/state';
import { ProtocolStateWithSharedData } from '../../../protocols';
import * as globalTestScenarios from '../../../__tests__/test-scenarios';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as testScenarios from '../../../__tests__/test-scenarios';
import * as transactionSubmissionScenarios from '../../transaction-submission/__tests__';
import * as states from '../state';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';

const { channelId, twoThree } = scenarios;

export const YOUR_DEPOSIT_A = twoThree[0];
export const YOUR_DEPOSIT_B = twoThree[1];
export const TOTAL_REQUIRED = twoThree.reduce(addHex);

// Helpers
const constructWalletState = (
  protocolState: states.DirectFundingState,
  ...channelStatuses: channelStates.ChannelState[]
): ProtocolStateWithSharedData<states.DirectFundingState> => {
  const channelState = channelStates.emptyChannelStore();
  for (const channelStatus of channelStatuses) {
    channelState[channelStatus.channelId] = { ...channelStatus };
  }
  return {
    protocolState,
    sharedData: {
      outboxState: emptyDisplayOutboxState(),
      fundingState: {},
      channelStore: channelState,
      adjudicatorState: {},
    },
  };
};

// Channel states
const aHasBothPrefundsChannelState = channelFromCommitments(
  testScenarios.signedCommitment0,
  testScenarios.signedCommitment1,
  globalTestScenarios.asAddress,
  globalTestScenarios.asPrivateKey,
);

const bHasBothPrefundsChannelState = channelFromCommitments(
  testScenarios.signedCommitment0,
  testScenarios.signedCommitment1,
  globalTestScenarios.bsAddress,
  globalTestScenarios.bsPrivateKey,
);

const aHasPostFund0ChannelState = channelFromCommitments(
  testScenarios.signedCommitment1,
  testScenarios.signedCommitment2,
  globalTestScenarios.bsAddress,
  globalTestScenarios.bsPrivateKey,
);

// Direct funding state machine states
const defaultsForA: states.DirectFundingState = {
  processId: `processId.${channelId}`,
  requestedTotalFunds: TOTAL_REQUIRED,
  requestedYourContribution: YOUR_DEPOSIT_A,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: '0x',
  type: states.NOT_SAFE_TO_DEPOSIT,
};

const defaultsForB: states.DirectFundingState = {
  ...defaultsForA,
  requestedYourContribution: YOUR_DEPOSIT_B,
  ourIndex: 1,
  safeToDepositLevel: YOUR_DEPOSIT_A,
};

export const aEachDepositsInSequenceHappyStates = {
  notSafeToDeposit: constructWalletState(
    states.notSafeToDeposit(defaultsForA),
    aHasBothPrefundsChannelState,
  ),
  waitForDepositTransactionStart: constructWalletState(
    states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.initialState,
    }),
    aHasBothPrefundsChannelState,
  ),
  waitForDepositTransactionEnd: constructWalletState(
    states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    aHasBothPrefundsChannelState,
  ),
  waitForFundingAndPostFundSetup: constructWalletState(
    states.waitForFundingAndPostFundSetup({
      ...defaultsForA,
      channelFunded: false,
      postFundSetupReceived: false,
    }),
    aHasBothPrefundsChannelState,
  ),
  waitForPostFundSetup: constructWalletState(
    states.waitForFundingAndPostFundSetup({
      ...defaultsForA,
      channelFunded: true,
      postFundSetupReceived: false,
    }),
    aHasPostFund0ChannelState,
  ),
  fundingSuccess: constructWalletState(
    states.fundingSuccess(defaultsForA),
    // TODO: this is an incorrect channel state
    aHasBothPrefundsChannelState,
  ),
};

export const bEachDepositsInSequenceHappyStates = {
  notSafeToDeposit: constructWalletState(
    states.notSafeToDeposit(defaultsForB),
    bHasBothPrefundsChannelState,
  ),
  waitForDepositTransactionStart: constructWalletState(
    states.waitForDepositTransaction({
      ...defaultsForB,
      transactionSubmissionState: transactionSubmissionScenarios.initialState,
    }),
    bHasBothPrefundsChannelState,
  ),
  waitForDepositTransactionEnd: constructWalletState(
    states.waitForDepositTransaction({
      ...defaultsForB,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState,
    }),
    bHasBothPrefundsChannelState,
  ),
  waitForFundingAndPostFundSetup: constructWalletState(
    states.waitForFundingAndPostFundSetup({
      ...defaultsForB,
      channelFunded: false,
      postFundSetupReceived: false,
    }),
    bHasBothPrefundsChannelState,
  ),
  waitForPostFundSetup: constructWalletState(
    states.waitForFundingAndPostFundSetup({
      ...defaultsForB,
      channelFunded: true,
      postFundSetupReceived: false,
    }),
    bHasBothPrefundsChannelState,
  ),
  fundingSuccess: constructWalletState(
    states.fundingSuccess(defaultsForB),
    bHasBothPrefundsChannelState,
  ),
};

export const transactionFails = {
  waitForDepositTransaction: constructWalletState(
    states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preFailureState,
    }),
    aHasBothPrefundsChannelState,
  ),
  failureTrigger: transactionSubmissionScenarios.failureTrigger,

  failure: constructWalletState(
    states.fundingFailure(defaultsForA),
    // TODO: this is an incorrect channel state
    aHasBothPrefundsChannelState,
  ),
};

export const actions = {
  postFundSetup0: globalActions.commitmentReceived(
    channelId,
    globalTestScenarios.signedCommitment2,
  ),
  postFundSetup1: globalActions.commitmentReceived(
    channelId,
    globalTestScenarios.signedCommitment3,
  ),
};
