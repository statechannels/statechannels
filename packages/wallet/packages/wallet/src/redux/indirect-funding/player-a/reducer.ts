import * as walletStates from '../../state';
import * as states from './state';
import * as actions from '../../actions';
import { unreachable } from '../../../utils/reducer-utils';
import { PlayerIndex } from '../../types';

export function playerAReducer(
  state: walletStates.Initialized,
  action: actions.indirectFunding.Action,
): walletStates.Initialized {
  if (!state.indirectFunding) {
    return state;
  }

  if (state.indirectFunding.player !== PlayerIndex.A) {
    return state;
  }

  switch (state.indirectFunding.type) {
    case states.WAIT_FOR_APPROVAL:
    case states.WAIT_FOR_PRE_FUND_SETUP_1:
    // pass the commitment to the channel state reducer
    // update channel state based on outcome
    // if ready to fund:
    //   initiate direct funding
    case states.WAIT_FOR_DIRECT_FUNDING:
    // progress direct funding
    // if direct funding is finished:
    //   send and/or wait for post-fund setup
    case states.WAIT_FOR_POST_FUND_SETUP_1:
    case states.WAIT_FOR_LEDGER_UPDATE_1:
      return state;
    default:
      return unreachable(state.indirectFunding);
  }
}
