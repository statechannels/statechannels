import { put } from 'redux-saga/effects';
import * as incoming from 'wallet-client/lib/messages-to-wallet';

import { messageListener } from '../message-listener';
import * as actions from '../../actions';
import { channel } from 'redux-saga';

describe('message listener', () => {
  const saga = messageListener();

  // having to do this next part is a bit nasty
  const mockActionChannel = channel();
  saga.next(mockActionChannel);

  it('converts INITIALIZE_REQUEST into a WALLET.LOGGED_IN', () => {
    const output = saga.next({ data: incoming.initializeRequest('abc123') }).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.loggedIn('abc123')));
  });

  // todo: is OWN_POSITION_RECEIVED actually easier to think about than SIGNATURE_REQUEST?
  it('converts SIGNATURE_REQUEST into OWN_POSITION_RECEIVED', () => {
    const output = saga.next({ data: incoming.signatureRequest('data') }).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.ownPositionReceived('data')));
  });

  it('converts VALIDATION_REQUEST into OPPONENT_POSITION_RECEIVED', () => {
    const output = saga.next({ data: incoming.validationRequest('data', 'signature') }).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.opponentPositionReceived('data', 'signature')));
  });
});
