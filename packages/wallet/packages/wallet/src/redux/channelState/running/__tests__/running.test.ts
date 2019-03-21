import { runningReducer } from '../reducer';
import * as scenarios from '../../../__tests__/test-scenarios';
import * as states from '../../state';
import * as actions from '../../../actions';
import * as outgoing from 'magmo-wallet-client/lib/wallet-events';
import {
  itDoesntTransition,
  itIncreasesTurnNumBy,
  itTransitionsToChannelStateType,
  itSendsThisMessage,
} from '../../../__tests__/helpers';
import * as SigningUtil from '../../../../utils/signing-utils';

const {
  asAddress,
  asPrivateKey,
  bsAddress,
  bsPrivateKey,
  gameCommitment1,
  gameCommitment2,
  gameCommitment3,
  channelNonce,
  channelId,
  channel,
  fundingState,
} = scenarios;

const defaults = {
  uid: 'uid',
  participants: channel.participants as [string, string],
  libraryAddress: channel.channelType,
  channelId,
  channelNonce,
  lastCommitment: { commitment: gameCommitment1, signature: 'sig' },
  penultimateCommitment: { commitment: gameCommitment2, signature: 'sig' },
  turnNum: gameCommitment2.turnNum,
  adjudicator: 'adj-address',
  challengeExpiry: new Date(),
  networkId: 2132,
  fundingState,
  funded: false,
};

const bParams = { address: bsAddress, ourIndex: 1, privateKey: bsPrivateKey };
const aParams = { address: asAddress, ourIndex: 0, privateKey: asPrivateKey };

describe('when in WaitForUpdate on our turn', () => {
  // after the reveal it is B's turn. So we must be B here
  const bDefaults = { ...defaults, ...bParams };
  const state = states.waitForUpdate(bDefaults);

  describe('when we send in a new position', () => {
    const action = actions.ownCommitmentReceived(gameCommitment3);
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
  });

  describe('when we send in a position with the wrong turnNum', () => {
    const action = actions.ownCommitmentReceived(gameCommitment2);
    const updatedState = runningReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

  describe('when an opponent sends a new position', () => {
    const action = actions.opponentCommitmentReceived(gameCommitment3, 'sig');
    const updatedState = runningReducer(state, action);

    itDoesntTransition(state, updatedState); // because it's our turn
  });

  describe('when the wallet detects an opponent challenge', () => {
    const action = actions.challengeCreatedEvent(
      '0xf00',
      scenarios.preFundCommitment1,
      defaults.challengeExpiry,
    );
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.CHOOSE_RESPONSE, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('when we request to launch a challenge', () => {
    const action = actions.challengeRequested();
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
    itSendsThisMessage(updatedState, outgoing.CHALLENGE_REJECTED);
  });
});

describe(`when in WaitForUpdate on our opponent's turn`, () => {
  // after the reveal it is B's turn. So we must be A here
  const aDefaults = { ...defaults, ...aParams };
  const state = states.waitForUpdate(aDefaults);

  describe('when we send in a new position', () => {
    const action = actions.ownCommitmentReceived(gameCommitment3);
    const updatedState = runningReducer(state, action);
    // it ignores it
    itDoesntTransition(state, updatedState);
  });

  describe('when an opponent sends a new position', () => {
    const action = actions.opponentCommitmentReceived(gameCommitment3, 'sig');
    const signMock = jest.fn().mockReturnValue('0x0');
    Object.defineProperty(SigningUtil, 'validCommitmentSignature', { value: signMock });
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.WAIT_FOR_UPDATE, updatedState);
    itIncreasesTurnNumBy(1, state, updatedState);
  });

  describe('when an opponent sends a new position with the wrong turnNum', () => {
    const action = actions.opponentCommitmentReceived(gameCommitment1, 'sig');
    const updatedState = runningReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

  describe('when an opponent sends a new position with the wrong signature', () => {
    const action = actions.opponentCommitmentReceived(gameCommitment3, 'not-a-signature');
    const updatedState = runningReducer(state, action);

    itDoesntTransition(state, updatedState);
  });

  describe('when the wallet detects an opponent challenge', () => {
    const action = actions.challengeCreatedEvent(
      '0xf00',
      scenarios.preFundCommitment1,
      defaults.challengeExpiry,
    );
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.CHOOSE_RESPONSE, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });

  describe('when we request to launch a challenge ', () => {
    const action = actions.challengeRequested();
    const updatedState = runningReducer(state, action);

    itTransitionsToChannelStateType(states.APPROVE_CHALLENGE, updatedState);
    itIncreasesTurnNumBy(0, state, updatedState);
  });
});
