import { put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import { messageListener } from '../message-listener';
import * as actions from '../../actions';
import { channel } from 'redux-saga';
import * as scenarios from '../../reducers/__tests__/test-scenarios';

describe('message listener', () => {
  const saga = messageListener();

  // having to do this next part is a bit nasty
  const mockActionChannel = channel();
  saga.next(mockActionChannel);

  it.skip('converts INITIALIZE_REQUEST into a WALLET.LOGGED_IN', () => {
    const output = saga.next({ data: incoming.initializeRequest('abc123') }).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.loggedIn('abc123')));
  });

  // TODO: these tests need to be updated once message listening is updated with commitments

  // todo: is OWN_POSITION_RECEIVED actually easier to think about than SIGNATURE_REQUEST?
  it.skip('converts SIGNATURE_REQUEST into OWN_POSITION_RECEIVED', () => {
    const output = saga.next({ data: incoming.signCommitmentRequest(scenarios.gameCommitment1) })
      .value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.ownCommitmentReceived(scenarios.gameCommitment1)));
  });

  it.skip('converts VALIDATION_REQUEST into OPPONENT_POSITION_RECEIVED', () => {
    const output = saga.next({
      data: incoming.validateCommitmentRequest(scenarios.gameCommitment1, 'signature'),
    }).value;
    saga.next(); // the take

    expect(output).toEqual(
      put(actions.opponentCommitmentReceived(scenarios.gameCommitment2, 'signature')),
    );
  });
});
