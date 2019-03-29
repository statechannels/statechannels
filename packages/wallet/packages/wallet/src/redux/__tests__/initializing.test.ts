import { walletReducer } from '../reducer';

import * as states from '../state';
import * as actions from '../actions';

const defaults = { ...states.emptyState, uid: 'uid' };

describe('when in WaitForLogin', () => {
  const state = states.waitForLogin();

  describe('when the player logs in', () => {
    const action = actions.loggedIn('uid');
    const updatedState = walletReducer(state, action);

    it('transitions to WAIT_FOR_ADJUDICATOR', async () => {
      expect(updatedState.type).toEqual(states.WAIT_FOR_ADJUDICATOR);
    });
  });
});

describe('when in WaitForAdjudicator', () => {
  const state = states.waitForAdjudicator(defaults);

  describe('when the adjudicator is known', () => {
    const action = actions.adjudicatorKnown('address', 'network_id');
    const updatedState = walletReducer(state, action);

    it('transitions to WALLET_INITIALIZED', async () => {
      expect(updatedState.type).toEqual(states.WALLET_INITIALIZED);
    });
  });
});
