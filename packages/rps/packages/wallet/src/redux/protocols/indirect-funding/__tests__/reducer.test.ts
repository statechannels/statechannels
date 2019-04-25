import * as actions from '../../../actions';
import * as states from '../../../state';
import { indirectFundingReducer, initialize } from '../reducer';
import * as playerA from '../player-a/reducer';
import * as playerB from '../player-b/reducer';

import * as scenarios from '../../../__tests__/test-scenarios';
import { PlayerIndex } from '../../../types';
import { emptyDisplayOutboxState } from '../../../outbox/state';
import { emptyChannelState } from '../../../channel-state/state';
const { channelId } = scenarios;
const emptySharedData = {
  outboxState: emptyDisplayOutboxState(),
  channelState: emptyChannelState(),
  adjudicatorState: {},
  fundingState: {},
};

const defaultSharedData = emptySharedData;

describe('when intialize is called', () => {
  it('works as player A', () => {
    const updatedState = initialize(channelId, PlayerIndex.A, defaultSharedData);

    expect(updatedState.protocolState).toMatchObject({
      type: states.indirectFunding.playerA.WAIT_FOR_APPROVAL,
    });
  });

  it('works as player B', () => {
    const updatedState = initialize(channelId, PlayerIndex.B, defaultSharedData);
    expect(updatedState.protocolState).toMatchObject({
      type: states.indirectFunding.playerB.WAIT_FOR_APPROVAL,
    });
  });
});

describe('when in a player A state', () => {
  const player = PlayerIndex.A;
  it('delegates to the playerAReducer', () => {
    const protocolState = states.indirectFunding.playerA.waitForApproval({ channelId, player });

    const action = actions.commitmentReceived(channelId, scenarios.gameCommitment1, '0x0');

    const playerAReducer = jest.fn();
    Object.defineProperty(playerA, 'playerAReducer', { value: playerAReducer });

    indirectFundingReducer(protocolState, defaultSharedData, action);
    expect(playerAReducer).toHaveBeenCalledWith(protocolState, defaultSharedData, action);
  });
});

describe('when in a player B state', () => {
  const player = PlayerIndex.B;
  it('delegates to the playerBReducer', () => {
    const protocolState = states.indirectFunding.playerB.waitForApproval({ channelId, player });

    const action = actions.commitmentReceived(channelId, scenarios.gameCommitment1, '0x0');

    const playerBReducer = jest.fn();
    Object.defineProperty(playerB, 'playerBReducer', { value: playerBReducer });

    indirectFundingReducer(protocolState, defaultSharedData, action);
    expect(playerBReducer).toHaveBeenCalledWith(protocolState, defaultSharedData, action);
  });
});
