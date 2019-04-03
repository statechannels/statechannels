import * as actions from '../../actions';
import * as states from '../../state';
import { indirectFundingReducer } from '../reducer';
import * as playerA from '../player-a/reducer';

import * as scenarios from '../../__tests__/test-scenarios';
import { PlayerIndex } from '../../types';

const { channelId, initializedState } = scenarios;
const defaultState = { ...initializedState };

describe("when the indirectFunding branch doesn't exist", () => {
  describe('when FUNDING_REQUESTED arrives', () => {
    it('works as player A', () => {
      const state = { ...defaultState };
      const action = actions.indirectFunding.fundingRequested(channelId, PlayerIndex.A);
      const updatedState = indirectFundingReducer(state, action);

      expect(updatedState.indirectFunding).toMatchObject({
        type: states.indirectFunding.playerA.WAIT_FOR_APPROVAL,
      });
    });

    it('works as player B', () => {
      const state = { ...defaultState };
      const action = actions.indirectFunding.fundingRequested(channelId, PlayerIndex.B);
      const updatedState = indirectFundingReducer(state, action);

      expect(updatedState.indirectFunding).toMatchObject({
        type: states.indirectFunding.playerB.WAIT_FOR_APPROVAL,
      });
    });
  });
});

describe('when the indirectFunding branch exists', () => {
  describe('when in a player A state', () => {
    const player = PlayerIndex.A;
    it('delegates to the playerAReducer', () => {
      const state = {
        ...defaultState,
        indirectFunding: states.indirectFunding.playerA.waitForApproval({ channelId, player }),
      };
      const action = actions.indirectFunding.playerA.strategyApproved(channelId);

      const playerAReducer = jest.fn();
      Object.defineProperty(playerA, 'playerAReducer', { value: playerAReducer });

      indirectFundingReducer(state, action);
      expect(playerAReducer).toHaveBeenCalledWith(state, action);
    });
  });

  describe('when in a player B state', () => {
    const player = PlayerIndex.B;
    it('delegates to the playerBReducer', () => {
      const state = {
        ...defaultState,
        indirectFunding: states.indirectFunding.playerB.waitForApproval({ channelId, player }),
      };
      const action = actions.indirectFunding.playerB.strategyProposed(channelId);
      const updatedState = indirectFundingReducer(state, action);

      expect(updatedState.indirectFunding).toMatchObject({
        type: states.indirectFunding.playerB.WAIT_FOR_DIRECT_FUNDING,
        ledgerId: 'ledgerId',
      });
    });
  });
});
