import {bigNumberify} from "ethers/utils";

import {addHex} from "../../../../utils/hex-utils";
import * as globalActions from "../../../actions";

import * as scenarios from "../../../__tests__/state-helpers";
import * as transactionSubmissionScenarios from "../../transaction-submission/__tests__";
import * as advanceChannelScenarios from "../../advance-channel/__tests__";
import * as states from "../states";
import {SharedData} from "../../../state";
import {ETH_ASSET_HOLDER_ADDRESS} from "../../../../constants";

const {threeWayLedgerId: channelId, twoThree} = scenarios;
export const assetHolderAddress = ETH_ASSET_HOLDER_ADDRESS;
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
  assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
  channelId,
  ourIndex: 0,
  safeToDepositLevel: "0x",
  type: "DirectFunding.NotSafeToDeposit",
  protocolLocator: [],
  funded: false
};

const defaultsForB = {
  ...defaultsForA,
  requiredDeposit: YOUR_DEPOSIT_B,
  ourIndex: 1,
  safeToDepositLevel: YOUR_DEPOSIT_A
};

// actions

const aDepositedEvent = globalActions.depositedEvent({
  processId,
  assetHolderAddress,
  destination: channelId,
  amountDeposited: bigNumberify(YOUR_DEPOSIT_A),
  destinationHoldings: bigNumberify(YOUR_DEPOSIT_A),
  protocolLocator: []
});

const bDepositedEvent = globalActions.depositedEvent({
  processId,
  assetHolderAddress,
  destination: channelId,
  amountDeposited: bigNumberify(YOUR_DEPOSIT_B),
  destinationHoldings: bigNumberify(TOTAL_REQUIRED),
  protocolLocator: []
});

const sharedData = () => ({...advanceChannelScenarios.preSuccess.sharedData});

const adjudicatorStateSharedData: SharedData = {
  ...sharedData(),
  adjudicatorState: {[channelId]: {channelId, finalized: false}}
};
export const aHappyPath = {
  initialize: {...defaultsForA, sharedData: sharedData()},
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState
    }),
    sharedData: sharedData(),
    action: transactionSubmissionScenarios.successTrigger
  },

  waitForFunding: {
    state: states.waitForFunding(defaultsForA),
    sharedData: sharedData(),
    action: bDepositedEvent
  }
};

export const bHappyPath = {
  initialize: {...defaultsForB, sharedData: sharedData()},
  notSafeToDeposit: {
    state: states.notSafeToDeposit(defaultsForB),
    action: aDepositedEvent,
    sharedData: sharedData()
  },
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForB,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState
    }),
    sharedData: sharedData(),
    action: transactionSubmissionScenarios.successTrigger
  },
  waitForFunding: {
    state: states.waitForFunding(defaultsForB),
    sharedData: sharedData(),
    action: bDepositedEvent
  }
};

export const depositNotRequired = {
  initialize: {...defaultsForA, requiredDeposit: "0x0", sharedData: sharedData()}
};
export const existingOnChainDeposit = {
  initialize: {
    ...defaultsForA,
    requiredDeposit: "0x05",
    sharedData: adjudicatorStateSharedData
  }
};

export const transactionFails = {
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preFailureState
    }),
    sharedData: sharedData(),

    action: transactionSubmissionScenarios.failureTrigger
  }
};

export const fundsReceivedArrivesEarly = {
  initialize: {...defaultsForA, sharedData: sharedData()},
  waitForDepositTransaction: {
    state: states.waitForDepositTransaction({
      ...defaultsForA,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState
    }),
    sharedData: sharedData(),
    action: aDepositedEvent
  },
  waitForDepositTransactionFunded: {
    state: states.waitForDepositTransaction({
      ...defaultsForB,
      funded: true,
      transactionSubmissionState: transactionSubmissionScenarios.preSuccessState
    }),
    sharedData: sharedData(),
    action: transactionSubmissionScenarios.successTrigger
  },

  waitForFunding: {
    state: states.waitForFunding(defaultsForA),
    sharedData: sharedData(),
    action: bDepositedEvent
  }
};
