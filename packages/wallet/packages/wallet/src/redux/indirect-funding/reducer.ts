import * as states from '../state';
import * as indirectFundingState from './state';
import * as actions from '../actions';
import { unreachable } from '../../utils/reducer-utils';
import { PlayerIndex } from '../types';
import { playerAReducer } from './player-a/reducer';

export const indirectFundingReducer = (
  state: states.Initialized,
  action: actions.indirectFunding.Action,
): states.Initialized => {
  if (action.type === actions.indirectFunding.FUNDING_REQUESTED) {
    return fundingRequestedReducer(state, action);
  }

  if (!state.indirectFunding) {
    return state;
  }

  switch (state.indirectFunding.player) {
    case PlayerIndex.A:
      return playerAReducer(state, action);
    case PlayerIndex.B:
      return playerBReducer(state, action);

    default:
      return unreachable(state.indirectFunding);
  }
};

function playerBReducer(
  state: states.Initialized,
  action: actions.indirectFunding.Action,
): states.Initialized {
  return {
    ...state,
    indirectFunding: states.indirectFunding.playerB.waitForDirectFunding({
      ledgerId: 'ledgerId',
      channelId: 'channelId',
      player: PlayerIndex.B,
    }),
  };
}

function fundingRequestedReducer(
  state: states.Initialized,
  action: actions.indirectFunding.FundingRequested,
): states.Initialized {
  const { channelId, playerIndex: player } = action;
  switch (player) {
    case PlayerIndex.A:
      return {
        ...state,
        indirectFunding: indirectFundingState.playerA.waitForApproval({ channelId, player }),
      };
    case PlayerIndex.B:
      return {
        ...state,
        indirectFunding: indirectFundingState.playerB.waitForApproval({ channelId, player }),
      };
    default:
      return unreachable(player);
  }
}
