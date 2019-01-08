import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';


import { scenarios } from '../../../../core';
import { itIncreasesTurnNumBy, itTransitionsToStateType } from './helpers';
import * as TransactionGenerator from '../../../utils/transaction-generator';
import * as outgoing from '../../../interface/outgoing';
import { ApproveFunding, WaitForDepositConfirmation } from '../../../states';


const {
  asAddress,
  bsAddress,
  asPrivateKey,
  bsPrivateKey,
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  preFundSetupAHex,
  preFundSetupBHex,
  preFundSetupBSig,
  postFundSetupAHex,
  postFundSetupBHex,
  postFundSetupASig,
  postFundSetupBSig,
} = scenarios.standard;

const defaults = {
  address: asAddress,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  networkId: 3,
  participants,
  uid: 'uid',
};

const defaultsA = {
  ...defaults,
  ourIndex: 0,
  privateKey: asPrivateKey,
};

const defaultsB = {
  ...defaults,
  ourIndex: 1,
  privateKey: bsPrivateKey,
};

const justReceivedPreFundSetupB = {
  penultimatePosition: { data: preFundSetupAHex, signature: '0xDEADBEEF' },
  lastPosition: { data: preFundSetupBHex, signature: preFundSetupBSig },
  turnNum: 1,
};

const justReceivedPostFundSetupA = {
  penultimatePosition: { data: preFundSetupBHex, signature: '0xDEADBEEF' },
  lastPosition: { data: postFundSetupAHex, signature: '0xDEADBEEF' },
  turnNum: 2,
};

const justReceivedPostFundSetupB = {
  penultimatePosition: { data: postFundSetupAHex, signature: '0xDEADBEEF' },
  lastPosition: { data: postFundSetupBHex, signature: '0xDEADBEEF' },
  turnNum: 3,
};


describe('start in WaitForFundingRequest', () => {
  describe('action taken: funding requested', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.fundingRequested();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.APPROVE_FUNDING, updatedState);
  });

  describe('action taken: funding requested', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.fundingRequested();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.APPROVE_FUNDING, updatedState);
  });

});

describe('start in ApproveFunding', () => {
  describe('incoming action: funding approved', () => { // player A scenario
    const createDeployTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createDeployTransaction', { value: createDeployTxMock });
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingApproved();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.A_WAIT_FOR_DEPLOY_TO_BE_SENT_TO_METAMASK, updatedState);
    expect(createDeployTxMock.mock.calls.length).toBe(1);
    expect(createDeployTxMock.mock.calls[0][2]).toBe("0x5");
  });

  describe('incoming action: funding rejected', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingRejected();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
  });


  describe('action taken: funding approved, adjudicator address not received', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB, adjudicator: undefined };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingApproved();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.B_WAIT_FOR_DEPLOY_ADDRESS, updatedState);
  });

  describe('action taken: funding approved, adjudicator address received', () => { // player B scenario
    const createDepositTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', { value: createDepositTxMock });
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingApproved();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK, updatedState);
    expect(createDepositTxMock.mock.calls.length).toBe(1);
    expect(createDepositTxMock.mock.calls[0][1]).toBe("0x5");
  });


  describe('action taken: message received', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.messageReceived("1234");
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.APPROVE_FUNDING, updatedState);
    expect((updatedState as ApproveFunding).adjudicator).toEqual("1234");
  });
});

describe('start in aWaitForDeployToBeSentToMetaMask', () => {
  describe('incoming action: deploySentToMetaMask', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.aWaitForDeployToBeSentToMetaMask(testDefaults);
    const action = actions.transactionSentToMetamask();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.A_SUBMIT_DEPLOY_IN_METAMASK, updatedState);
  });
});

describe('start in aSubmitDeployInMetaMask', () => {
  describe('incoming action: deploy submitted', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.aSubmitDeployInMetaMask(testDefaults);
    const action = actions.transactionSubmitted();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_DEPLOY_CONFIRMATION, updatedState);
  });

  describe('incoming action: transaction submission failed', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.aSubmitDeployInMetaMask(testDefaults);
    const action = actions.transactionSubmissionFailed({ code: "1234" });
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
  });

});

describe('start in WaitForDeployConfirmation', () => {
  describe('incoming action: transaction confirmed', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.waitForDeployConfirmation(testDefaults);
    const action = actions.transactionConfirmed('1234');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.A_WAIT_FOR_DEPOSIT, updatedState);
  });
  describe('incoming action: transaction confirmed, funding event already received', () => { // player A scenario
    const unhandledAction = actions.fundingReceivedEvent(1000, bsAddress, '0x0a');
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB, unhandledAction };
    const state = states.waitForDeployConfirmation(testDefaults);
    const action = actions.transactionConfirmed('1234');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.A_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
    expect((updatedState.messageOutbox as outgoing.SendMessage).type).toEqual(outgoing.SEND_MESSAGE);
  });
});

describe('start in AWaitForDeposit', () => {
  describe('incoming action: funding received event', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.aWaitForDeposit(testDefaults);
    const action = actions.fundingReceivedEvent(1000, bsAddress, '0x0a');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.A_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
    expect((updatedState.messageOutbox as outgoing.SendMessage).type).toEqual(outgoing.SEND_MESSAGE);
  });
});

describe('start in AWaitForPostFundSetup', () => {
  describe('incoming action: message received', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupA };
    const state = states.aWaitForPostFundSetup(testDefaults);
    const action = actions.messageReceived(postFundSetupBHex, postFundSetupBSig);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
  });
});

describe('start in BWaitForDeployAddress', () => {
  describe('incoming action: message received', () => { // player B scenario
    const createDepositTxMock = jest.fn();
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', { value: createDepositTxMock });
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.bWaitForDeployAddress(testDefaults);
    const action = actions.messageReceived("1234");
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK, updatedState);
    expect(createDepositTxMock.mock.calls.length).toBe(1);
    expect(createDepositTxMock.mock.calls[0][1]).toBe("0x5");
  });
});

describe('start in BWaitForDepositToBeSentToMetaMask', () => {
  describe('incoming action: transaction sent to metamask', () => { // player B scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.bWaitForDepositToBeSentToMetaMask(testDefaults);
    const action = actions.transactionSentToMetamask();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.B_SUBMIT_DEPOSIT_IN_METAMASK, updatedState);
  });
});

describe('start in BSubmitDepositInMetaMask', () => {
  describe('incoming action: transaction submitted', () => { // player B scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.bSubmitDepositInMetaMask(testDefaults);
    const action = actions.transactionSubmitted();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_DEPOSIT_CONFIRMATION, updatedState);
  });

  describe('incoming action: transaction submission failed', () => { // player B scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.bSubmitDepositInMetaMask(testDefaults);
    const action = actions.transactionSubmissionFailed({ code: "1234" });
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
  });

});


describe('start in WaitForDepositConfirmation', () => {
  describe('incoming action: deposit confirmed', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.waitForDepositConfirmation(testDefaults);
    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.B_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('incoming action: deposit confirmed, postFundA already received', () => { // player B scenario
    const testDefaults = {
      ...defaultsB,
      ...justReceivedPreFundSetupB,
      unhandledAction: actions.messageReceived(postFundSetupAHex, postFundSetupASig),
    };
    const state = states.waitForDepositConfirmation(testDefaults);
    const action = actions.transactionConfirmed();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itIncreasesTurnNumBy(2, state, updatedState);
  });


  describe('incoming action: message received', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.waitForDepositConfirmation(testDefaults);
    const action = actions.messageReceived(postFundSetupAHex, postFundSetupASig);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_DEPOSIT_CONFIRMATION, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
    expect((updatedState as WaitForDepositConfirmation).unhandledAction).toEqual(action);
  });
});

describe('start in BWaitForPostFundSetup', () => {
  describe('incoming action: message received', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.bWaitForPostFundSetup(testDefaults);
    const action = actions.messageReceived(postFundSetupAHex, postFundSetupASig);
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itIncreasesTurnNumBy(2, state, updatedState);
    expect((updatedState.messageOutbox as outgoing.SendMessage).type).toEqual(outgoing.SEND_MESSAGE);
  });
});

describe('start in AcknowledgeFundingSuccess', () => {
  describe('incoming action: FundingSuccessAcknowledged', () => { // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.fundingSuccessAcknowledged();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);
  });

  describe('incoming action: FundingSuccessAcknowledged', () => { // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.fundingSuccessAcknowledged();
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_UPDATE, updatedState);
    expect((updatedState.messageOutbox as outgoing.FundingSuccess).type).toEqual(outgoing.FUNDING_SUCCESS);
  });
});