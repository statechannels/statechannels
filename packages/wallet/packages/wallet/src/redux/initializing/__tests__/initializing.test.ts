import { initializingReducer } from '../reducer';

import * as states from '../../state';
import * as actions from '../../actions';

const defaults = { uid: 'uid', outboxState: {} };

describe('when in WaitForLogin', () => {
  const state = states.waitForLogin();

  describe('when the player logs in', () => {
    const action = actions.loggedIn('uid');
    const updatedState = initializingReducer(state, action);

    it('transitions to WAIT_FOR_ADJUDICATOR', async () => {
      expect(updatedState.type).toEqual(states.WAIT_FOR_ADJUDICATOR);
    });
  });
});

describe('when in WaitForAdjudicator', () => {
  const state = states.waitForAdjudicator(defaults);

  describe('when the adjudicator is known', () => {
    const action = actions.adjudicatorKnown('address', 'network_id');
    const updatedState = initializingReducer(state, action);

    it('transitions to WAIT_FOR_ADJUDICATOR', async () => {
      expect(updatedState.type).toEqual(states.WAITING_FOR_CHANNEL_INITIALIZATION);
    });
  });
});
