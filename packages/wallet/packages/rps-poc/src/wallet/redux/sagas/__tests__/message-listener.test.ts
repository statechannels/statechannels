import { put } from 'redux-saga/effects';

import { loginSuccess } from '../../../../redux/login/actions';

import * as incoming from '../../../interface/incoming';

import { messageListener } from '../message-listener';
import * as actions from '../../actions';
import { channel } from 'redux-saga';

describe('message listener', () => {
  const saga = messageListener();

  // having to do this next part is a bit nasty
  saga.next();
  const mockActionChannel = channel();
  saga.next(mockActionChannel);

  it('converts LOGIN_SUCCESS into a WALLET.LOGGED_IN', () => {
    const output = saga.next(loginSuccess({ uid: 'abc123' }, '0xlibraryAddress')).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.loggedIn('abc123')));
  });

  // todo: is OWN_POSITION_RECEIVED actually easier to think about than SIGNATURE_REQUEST?
  it('converts SIGNATURE_REQUEST into OWN_POSITION_RECEIVED', () => {
    const output = saga.next(incoming.signatureRequest('req-id', 'data')).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.ownPositionReceived('data')));
  });

  it('converts VALIDATION_REQUEST into OPPONENT_POSITION_RECEIVED', () => {
    const output = saga.next(incoming.validationRequest('requestId', 'data', 'signature')).value;
    saga.next(); // the take

    expect(output).toEqual(put(actions.opponentPositionReceived('data', 'signature')));
  });
});
