import { walletReducer } from '..';

import * as states from '../../../states';
import * as actions from '../../actions';

import { itTransitionsToStateType } from './helpers';

const defaults = { uid: 'uid', address: '0xa', privateKey: '0xb' };

describe('when in WaitForLogin', () => {
  const state = states.waitForLogin();

  describe('when the player logs in', () => {
    const action = actions.loggedIn('uid');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_ADDRESS, updatedState);
  });
});

describe('when in WaitForAddress', () => {
  const state = states.waitForAddress(defaults);

  describe('when the key loader provides the keys', () => {
    const action = actions.keysLoaded('address', 'privateKey', 'networkId');
    const updatedState = walletReducer(state, action);

    itTransitionsToStateType(states.WAIT_FOR_CHANNEL, updatedState);
  });
});
