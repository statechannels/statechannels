import { fundingReducer } from '../reducer';

import * as states from '../../state';
import * as actions from '../../../actions';

import * as scenarios from '../../../__tests__/test-scenarios';
import {
  itTransitionsToChannelStateType,
  itIncreasesTurnNumBy,
  itSendsThisMessage,
  itSendsNoMessage,
} from '../../../__tests__/helpers';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import * as SigningUtil from '../../../../utils/signing-utils';
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
  channelId,
} = scenarios;

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
  funded: false,
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

const MOCK_SIGNATURE = 'signature';
const justReceivedPreFundSetupB = {
  penultimateCommitment: { commitment: preFundCommitment1, signature: MOCK_SIGNATURE },
  lastCommitment: { commitment: preFundCommitment2, signature: MOCK_SIGNATURE },
  turnNum: 1,
};

const justReceivedPostFundSetupA = {
  penultimateCommitment: { commitment: preFundCommitment2, signature: MOCK_SIGNATURE },
  lastCommitment: { commitment: postFundCommitment1, signature: MOCK_SIGNATURE },
  turnNum: 2,
  funded: true,
};

const justReceivedPostFundSetupB = {
  penultimateCommitment: { commitment: postFundCommitment1, signature: MOCK_SIGNATURE },
  lastCommitment: { commitment: postFundCommitment2, signature: MOCK_SIGNATURE },
  turnNum: 3,
  funded: true,
};

const playerDefaults = {
  A: defaultsA,
  B: defaultsB,
};

describe('start in WaitForFundingRequest', () => {
  describe('action taken: funding requested', () => {
    // player A scenario
    const testDefaults = {
      ...defaultsA,
      ...justReceivedPreFundSetupB,
    };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.channel.fundingRequested();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_APPROVAL, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('action taken: funding requested', () => {
    // player B scenario
    const testDefaults = {
      ...defaultsB,
      ...justReceivedPreFundSetupB,
    };
    const state = states.waitForFundingRequest(testDefaults);
    const action = actions.channel.fundingRequested();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_APPROVAL, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
});

describe('start in WaitForFundingApproval', () => {
  describe('incoming action: funding approved', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.channel.fundingApproved();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
  describe('incoming action: funding rejected', () => {
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.channel.fundingRejected();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_CHANNEL, updatedState);
    itSendsThisMessage(updatedState, [outgoing.MESSAGE_RELAY_REQUESTED, outgoing.FUNDING_FAILURE]);
  });

  describe('incoming action: Funding declined message received', () => {
    const testDefaults = { ...defaultsA, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.channel.messageReceived('FundingDeclined');
    const updatedState = fundingReducer(state, action);
    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_DECLINED, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('incoming action: funding approved', () => {
    // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPreFundSetupB };
    const state = states.approveFunding(testDefaults);
    const action = actions.channel.fundingApproved();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
});

describe('start in WaitForFundingAndPostFundSetup', () => {
  function startingState(player: 'A' | 'B') {
    const params = {
      ...playerDefaults[player],
      ...justReceivedPreFundSetupB,
    };
    return states.waitForFundingAndPostFundSetup(params);
  }

  describe('incoming action: Funding declined message received', () => {
    const state = startingState('A');
    const action = actions.channel.messageReceived('FundingDeclined');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_DECLINED, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('incoming action: INTERNAL.DIRECT_FUNDING_CONFIRMED', () => {
    const state = startingState('A');
    const action = actions.internal.directFundingConfirmed(channelId);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.A_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
  });

  describe('incoming action: COMMITMENT_RECEIVED', () => {
    const state = startingState('A');
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const action = actions.channel.commitmentReceived(postFundCommitment1, '0x0');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP, updatedState);
    // B moved out of turn, so A should ignore B's move.
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('incoming action: COMMITMENT_RECEIVED', () => {
    const state = startingState('B');
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const action = actions.channel.commitmentReceived(postFundCommitment1, '0x0');
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_FUNDING_CONFIRMATION, updatedState);
    // A sent commitment too early. B stores A's commitment, but does not respond.
    itIncreasesTurnNumBy(1, state, updatedState);
    itSendsNoMessage(updatedState);
  });

  describe('incoming action: INTERNAL.DIRECT_FUNDING_CONFIRMED', () => {
    const state = startingState('B');
    const action = actions.internal.directFundingConfirmed(channelId);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.B_WAIT_FOR_POST_FUND_SETUP, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
});

describe('start in WaitForFundingConfirmation', () => {
  describe('incoming action: INTERNAL.DIRECT_FUNDING_CONFIRMED', () => {
    // As player B
    const validateMock = jest.fn().mockReturnValue(MOCK_SIGNATURE);
    Object.defineProperty(SigningUtil, 'signCommitment', { value: validateMock });

    const testData = { ...defaultsB, ...justReceivedPostFundSetupA };
    const state = states.waitForFundingConfirmation(testData);
    const action = actions.internal.directFundingConfirmed(channelId);
    const updatedState = fundingReducer(state, action);

    const sendCommitmentAction = outgoing.commitmentRelayRequested(
      state.participants[1 - state.ourIndex],
      postFundCommitment2,
      MOCK_SIGNATURE,
    );

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itSendsThisMessage(updatedState, sendCommitmentAction);
    itIncreasesTurnNumBy(1, state, updatedState);
  });
});

describe('start in AWaitForPostFundSetup', () => {
  describe('incoming action: message received', () => {
    // player A scenario
    const validateMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: validateMock });

    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupA };
    const state = states.aWaitForPostFundSetup({ ...testDefaults });
    const action = actions.channel.commitmentReceived(postFundCommitment2, MOCK_SIGNATURE);
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
    const action = actions.channel.commitmentReceived(postFundCommitment1, MOCK_SIGNATURE);
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.ACKNOWLEDGE_FUNDING_SUCCESS, updatedState);
    itSendsThisMessage(updatedState, outgoing.COMMITMENT_RELAY_REQUESTED);
    itIncreasesTurnNumBy(2, state, updatedState);
  });
});

describe('start in AcknowledgeFundingSuccess', () => {
  describe('incoming action: FundingSuccessAcknowledged', () => {
    // player A scenario
    const testDefaults = { ...defaultsA, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.channel.fundingSuccessAcknowledged();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itSendsThisMessage(updatedState, outgoing.FUNDING_SUCCESS);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('incoming action: FundingSuccessAcknowledged', () => {
    // player B scenario
    const testDefaults = { ...defaultsB, ...justReceivedPostFundSetupB };
    const state = states.acknowledgeFundingSuccess(testDefaults);
    const action = actions.channel.fundingSuccessAcknowledged();
    const updatedState = fundingReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itSendsThisMessage(updatedState, outgoing.FUNDING_SUCCESS);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
});
