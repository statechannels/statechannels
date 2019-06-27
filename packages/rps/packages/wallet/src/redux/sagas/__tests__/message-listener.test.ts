import { put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import { messageListener } from '../message-listener';
import * as actions from '../../actions';
import { channel } from 'redux-saga';
import * as scenarios from '../../__tests__/test-scenarios';
import { APPLICATION_PROCESS_ID } from '../../../redux/protocols/application/reducer';

describe('message listener', () => {
  const saga = messageListener();

  // having to do this next part is a bit nasty
  const mockActionChannel = channel();
  saga.next(mockActionChannel);

  it('converts INITIALIZE_REQUEST into a WALLET.LOGGED_IN', () => {
    const output = saga.next({ data: incoming.initializeRequest('abc123') }).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.loggedIn({ uid: 'abc123' })));
  });

  // TODO: these tests need to be updated once message listening is updated with commitments

  // todo: is OWN_POSITION_RECEIVED actually easier to think about than SIGNATURE_REQUEST?
  it('converts SIGNATURE_REQUEST into OWN_POSITION_RECEIVED', () => {
    saga.next({ data: incoming.signCommitmentRequest(scenarios.gameCommitment1) });

    const output = saga.next().value; // the take

    expect(output).toEqual(
      put(
        actions.application.ownCommitmentReceived({
          processId: APPLICATION_PROCESS_ID,
          commitment: scenarios.gameCommitment1,
        }),
      ),
    );
    saga.next();
  });

  it('converts VALIDATION_REQUEST into OPPONENT_POSITION_RECEIVED', () => {
    saga.next({
      data: incoming.validateCommitmentRequest(scenarios.gameCommitment1, 'signature'),
    });
    const output = saga.next().value; // the take

    expect(output).toEqual(
      put(
        actions.application.opponentCommitmentReceived({
          processId: APPLICATION_PROCESS_ID,
          commitment: scenarios.gameCommitment1,
          signature: 'signature',
        }),
      ),
    );
    saga.next();
  });
});
