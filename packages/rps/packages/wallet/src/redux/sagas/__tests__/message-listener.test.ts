import { put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import { messageListener } from '../message-listener';
import * as actions from '../../actions';
import { channel } from 'redux-saga';
import { APPLICATION_PROCESS_ID } from '../../../redux/protocols/application/reducer';
import { appCommitment } from '../../../domain/commitments/__tests__';

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
    saga.next({ data: incoming.signCommitmentRequest(appCommitment({ turnNum: 19 }).commitment) });

    const output = saga.next().value; // the take

    expect(output).toEqual(
      put(
        actions.application.ownCommitmentReceived({
          processId: APPLICATION_PROCESS_ID,
          commitment: appCommitment({ turnNum: 19 }).commitment,
        }),
      ),
    );
    saga.next();
  });

  it('converts VALIDATION_REQUEST into OPPONENT_POSITION_RECEIVED', () => {
    saga.next({
      data: incoming.validateCommitmentRequest(
        appCommitment({ turnNum: 19 }).commitment,
        'signature',
      ),
    });
    const output = saga.next().value; // the take

    expect(output).toEqual(
      put(
        actions.application.opponentCommitmentReceived({
          processId: APPLICATION_PROCESS_ID,
          commitment: appCommitment({ turnNum: 19 }).commitment,
          signature: 'signature',
        }),
      ),
    );
    saga.next();
  });
});
