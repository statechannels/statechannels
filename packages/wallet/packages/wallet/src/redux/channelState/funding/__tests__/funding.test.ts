import { fundingReducer } from '../reducer';

import * as states from '../../state';
import * as fundingStates from '../../fundingState/state';
import * as actions from '../../../actions';

import * as scenarios from '../../../__tests__/test-scenarios';
import {
  itTransitionsToChannelStateType,
  itIncreasesTurnNumBy,
  itSendsThisMessage,
  itTransitionsToStateType,
  expectThisCommitmentSent,
  itSendsThisTransaction,
  itSendsNoTransaction,
} from '../../../__tests__/helpers';
import * as TransactionGenerator from '../../../../utils/transaction-generator';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as SigningUtil from '../../../../utils/signing-utils';
import * as fmgCore from 'fmg-core';
import { bigNumberify } from 'ethers/utils';
import { NextChannelState } from '../../../shared/state';
import { WAIT_FOR_FUNDING_REQUEST, WaitForFundingRequest } from '../../fundingState/state';
import { DIRECT_FUNDING } from '../../fundingState/shared/state';

const {
  asAddress,
  asPrivateKey,
  bsPrivateKey,
  channelNonce,
  libraryAddress,
  participants,
  preFundCommitment1,
  preFundCommitment2,
  postFundCommitment1,
  postFundCommitment2,
  // bsAddress,
  channelId,
} = scenarios;
const TX = '1234';

const TOTAL_FUNDING = bigNumberify(1000000000000000).toHexString();
const ZERO = bigNumberify(0).toHexString();
const unknownFundingState: WaitForFundingRequest = {
  type: WAIT_FOR_FUNDING_REQUEST,
  fundingType: fundingStates.UNKNOWN_FUNDING_TYPE,
  requestedTotalFunds: TOTAL_FUNDING,
  requestedYourContribution: ZERO,
  channelId,
};
const directFundingState: fundingStates.DirectFundingState = {
  type: fundingStates.WAIT_FOR_FUNDING_APPROVAL,
  fundingType: DIRECT_FUNDING,
  requestedTotalFunds: TOTAL_FUNDING,
  requestedYourContribution: ZERO,
  channelId,
};

const fundingStateWithTx = { ...directFundingState, transactionHash: TX };
const defaults = {
  address: asAddress,
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  networkId: 3,
  participants,
  uid: 'uid',
  transactionHash: '0x0',
  fundingState: directFundingState,
  funded: false,
};

const A_CONTRIBUTION = bigNumberify(400000000000000).toHexString();
const B_CONTRIBUTION = bigNumberify(600000000000000).toHexString();
const playerContribution = {
  A: A_CONTRIBUTION,
  B: B_CONTRIBUTION,
};

const playerFundingState = {
  A: { ...directFundingState, requestedYourContribution: A_CONTRIBUTION },
  B: { ...directFundingState, requestedYourContribution: B_CONTRIBUTION },
};

const defaultsA = {
  ...defaults,
  ourIndex: 0,
  privateKey: asPrivateKey,
  fundingState: playerFundingState.A,
};

const defaultsB = {
  ...defaults,
  ourIndex: 1,
  privateKey: bsPrivateKey,
  fundingState: playerFundingState.B,
};

const justReceivedPreFundSetupB = {
  penultimateCommitment: { commitment: preFundCommitment1, signature: 'sig' },
  lastCommitment: { commitment: preFundCommitment2, signature: 'sig' },
  turnNum: 1,
};

const justReceivedPostFundSetupA = {
  penultimateCommitment: { commitment: preFundCommitment2, signature: 'sig' },
  lastCommitment: { commitment: postFundCommitment1, signature: 'sig' },
  turnNum: 2,
  funded: true,
};

const justReceivedPostFundSetupB = {
  penultimateCommitment: { commitment: postFundCommitment1, signature: 'sig' },
  lastCommitment: { commitment: postFundCommitment2, signature: 'sig' },
  turnNum: 3,
  funded: true,
};

const playerDefaults = {
  A: defaultsA,
  B: defaultsB,
};

const justReceivedPostFundSetup = {
  A: justReceivedPostFundSetupA,
  B: justReceivedPostFundSetupB,
};

describe('start in WaitForFundingRequest', () => {
  describe('action taken: funding requested', () => {
    // player A scenario
    const testDefaults = {
      ...defaultsA,
      ...justReceivedPreFundSetupB,
      fundingState: unknownFundingState,
    };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.fundingRequested();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_APPROVAL, updatedState);
    itTransitionsFundingStateToType(fundingStates.WAIT_FOR_FUNDING_APPROVAL, updatedState);
  });

  describe('action taken: funding requested', () => {
    // player B scenario
    const testDefaults = {
      ...defaultsB,
      ...justReceivedPreFundSetupB,
      fundingState: { ...unknownFundingState },
    };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.fundingRequested();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_APPROVAL, updatedState);
    itTransitionsFundingStateToType(fundingStates.WAIT_FOR_FUNDING_APPROVAL, updatedState);
  });
});

describe('start in WaitForFundingApproval', () => {
  const createDeployTxMock = jest.fn(() => TX);
  Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
    value: createDeployTxMock,
  });
  describe('incoming action: funding approved', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingApproved();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    expect(createDeployTxMock.mock.calls.length).toBe(1);
    // expect(createDeployTxMock.mock.calls[0][2]).toBe(state.lastCommitment.commitment.allocation[0]);
  });

  describe('incoming action: funding rejected', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.fundingRejected();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.SEND_FUNDING_DECLINED_MESSAGE, updatedState);
    itSendsNoTransaction(updatedState);
  });

  describe('incoming action: Funding declined message received', () => {
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.messageReceived('FundingDeclined');
    const updatedState = fundingReducer(state, action);
    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_DECLINED, updatedState);
  });
});

describe('start in WaitForFundingAndPostFundSetup', () => {
  function startingState(player: 'A' | 'B', fundingState) {
    const params = {
      ...playerDefaults[player],
      ...justReceivedPreFundSetupB,
      fundingState: { ...fundingState, requestedYourContribution: playerContribution[player] },
    };
    return states.waitForFundingAndPostFundSetup(params);
  }

  describe('incoming action: Funding declined message received', () => {
    const fundingState = fundingStates.aWaitForDepositConfirmation(fundingStateWithTx);
    const state = startingState('A', fundingState);
    const action = actions.messageReceived('FundingDeclined');
    const updatedState = fundingReducer(state, action);
    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_DECLINED, updatedState);
  });

  describe('incoming action: funding received event', () => {
    // player A scenario
    const fundingState = fundingStates.aWaitForOpponentDeposit(directFundingState);
    const state = startingState('A', fundingState);
    const action = actions.fundingReceivedEvent(channelId, TOTAL_FUNDING, TOTAL_FUNDING);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.A_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
  });

  describe('incoming action: first funding received event, with enough funds', () => {
    // player B scenario
    const createDepositTxMock = jest.fn().mockReturnValue(TX);
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
      value: createDepositTxMock,
    });

    const fundingState = fundingStates.bWaitForOpponentDeposit(directFundingState);
    const state = startingState('B', {
      ...fundingState,
      requestedYourContribution: B_CONTRIBUTION,
    });
    const action = actions.fundingReceivedEvent(channelId, A_CONTRIBUTION, A_CONTRIBUTION);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    itTransitionsFundingStateToType(
      fundingStates.B_WAIT_FOR_DEPOSIT_TO_BE_SENT_TO_METAMASK,
      updatedState,
    );
    itSendsThisTransaction(updatedState, TX);
    expect(createDepositTxMock.mock.calls.length).toBe(1);
    expect(createDepositTxMock.mock.calls[0][1]).toBe(B_CONTRIBUTION);
  });

  describe('incoming action: first funding received event, without enough funds', () => {
    // player B scenario
    const createDepositTxMock = jest.fn().mockReturnValue(TX);
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
      value: createDepositTxMock,
    });

    const fundingState = fundingStates.bWaitForOpponentDeposit(directFundingState);
    const state = startingState('B', fundingState);
    const action = actions.fundingReceivedEvent(channelId, '0x01', '0x01');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    itTransitionsFundingStateToType(fundingStates.B_WAIT_FOR_OPPONENT_DEPOSIT, updatedState);
    itSendsNoTransaction(updatedState);
  });

  describe('incoming action: second funding received event, with enough funds', () => {
    // player B scenario
    const createDepositTxMock = jest.fn().mockReturnValue(TX);
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
      value: createDepositTxMock,
    });

    const fundingState = fundingStates.bWaitForDepositConfirmation({
      ...fundingStateWithTx,
      requestedYourContribution: B_CONTRIBUTION,
    });
    const state = startingState('B', fundingState);
    const action = actions.fundingReceivedEvent(channelId, TOTAL_FUNDING, TOTAL_FUNDING);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.B_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itTransitionsFundingStateToType(fundingStates.FUNDING_CONFIRMED, updatedState);
    itSendsNoTransaction(updatedState);
  });

  describe('incoming action: transaction confirmed', () => {
    // player B scenario
    const createDepositTxMock = jest.fn().mockReturnValue(TX);
    Object.defineProperty(TransactionGenerator, 'createDepositTransaction', {
      value: createDepositTxMock,
    });

    const fundingState = fundingStates.bWaitForDepositConfirmation({
      ...fundingStateWithTx,
      requestedYourContribution: B_CONTRIBUTION,
    });
    const state = startingState('B', fundingState);
    const action = actions.transactionConfirmed();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.B_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itTransitionsFundingStateToType(fundingStates.FUNDING_CONFIRMED, updatedState);
    itSendsNoTransaction(updatedState);
  });

  describe('incoming action: message received', () => {
    // player B scenario
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const fundingState = fundingStates.bWaitForDepositConfirmation(fundingStateWithTx);
    const state = startingState('B', fundingState);
    const action = actions.commitmentReceived(postFundCommitment1, '0x0');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_CONFIRMATION, updatedState);
    itTransitionsFundingStateToType(fundingStates.B_WAIT_FOR_DEPOSIT_CONFIRMATION, updatedState);
    itIncreasesTurnNumBy(2, state, updatedState);
  });
});

describe('start in WaitForFundingConfirmation', () => {
  function startingState(player, fundingState) {
    const params = {
      ...playerDefaults[player],
      ...justReceivedPostFundSetup[player],
      fundingState,
    };
    return states.waitForFundingConfirmation(params);
  }

  describe('incoming action: funding event received, with enough funds', () => {
    // player A scenario
    const fundingState = fundingStates.aWaitForOpponentDeposit(directFundingState);
    const state = startingState('A', fundingState);
    const action = actions.fundingReceivedEvent(channelId, TOTAL_FUNDING, TOTAL_FUNDING);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
  });

  describe('incoming action: funding event received, with not enough funds', () => {
    // player A scenario
    const fundingState = fundingStates.bWaitForOpponentDeposit(directFundingState);
    const state = startingState('A', fundingState);
    const action = actions.transactionConfirmed();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_CONFIRMATION, updatedState);
  });

  describe('incoming action: funding event received, with enough funds', () => {
    // player B scenario
    const fundingState = fundingStates.bWaitForDepositConfirmation(fundingStateWithTx);
    const state = startingState('B', fundingState);
    const action = actions.transactionConfirmed();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
  });

  describe('incoming action: funding event received, with not enough funds', () => {
    // player B scenario
    const fundingState = fundingStates.bWaitForOpponentDeposit(directFundingState);
    const state = startingState('B', fundingState);
    const action = actions.transactionConfirmed();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_CONFIRMATION, updatedState);
  });
});

describe('start in SendFundingDeclinedMessage', () => {
  describe('incoming action: message sent', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.sendFundingDeclinedMessage(testDefaults);
    const action = actions.messageSent();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_CHANNEL, updatedState);
    itSendsThisMessage(updatedState, outgoing.FUNDING_FAILURE);
  });
});

describe('start in AWaitForPostFundSetup', () => {
  describe('incoming action: message received', () => {
    // player A scenario
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupA };
    const state = states.aWaitForPostFundSetup({
      ...testDefaults,
      fundingState: { ...directFundingState, type: fundingStates.FUNDING_CONFIRMED },
    });
    const action = actions.commitmentReceived(postFundCommitment2, 'sig');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
  });
});

describe('start in BWaitForPostFundSetup', () => {
  describe('incoming action: message received', () => {
    // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.bWaitForPostFundSetup(testDefaults);
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validSignature', { value: validateMock });
    const action = actions.commitmentReceived(postFundCommitment1, 'sig');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itIncreasesTurnNumBy(2, state, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
  });
});

describe('start in AcknowledgeFundingSuccess', () => {
  describe('incoming action: FundingSuccessAcknowledged', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.fundingSuccessAcknowledged();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    it('sends PostFundSetupB', () => {
      expectThisCommitmentSent(updatedState, {
        commitmentType: fmgCore.CommitmentType.PostFundSetup,
        commitmentCount: 1,
      });
    });
  });

  describe('incoming action: FundingSuccessAcknowledged', () => {
    // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.fundingSuccessAcknowledged();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itSendsThisMessage(updatedState, outgoing.FUNDING_SUCCESS);
    it('sends PostFundSetupB', () => {
      expectThisCommitmentSent(updatedState, {
        commitmentType: fmgCore.CommitmentType.PostFundSetup,
        commitmentCount: 1,
      });
    });
  });
});

function itTransitionsFundingStateToType(type: any, state: NextChannelState<states.ChannelState>) {
  return itTransitionsToStateType(
    type,
    (state.channelState as states.OpenedChannelState).fundingState,
  );
}
