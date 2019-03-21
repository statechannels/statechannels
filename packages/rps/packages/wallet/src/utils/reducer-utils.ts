import { Commitment } from 'fmg-core';
import { ChannelState } from '../redux/channelState/state';
import { channelID } from 'fmg-core/lib/channel';
import { applySideEffects } from '../redux/outbox';
import { OutboxState } from 'src/redux/outbox/state';

export function unreachable(x: never) {
  return x;
}

export const validTransition = (fromState: ChannelState, toCommitment: Commitment) => {
  // todo: check the game rules

  if (!('turnNum' in fromState)) {
    return false;
  }
  if (!('libraryAddress' in fromState)) {
    return false;
  }

  return (
    toCommitment.turnNum === fromState.turnNum + 1 &&
    toCommitment.channel.nonce === fromState.channelNonce &&
    toCommitment.channel.participants[0] === fromState.participants[0] &&
    toCommitment.channel.participants[1] === fromState.participants[1] &&
    toCommitment.channel.channelType === fromState.libraryAddress &&
    channelID(toCommitment.channel) === fromState.channelId
  );
};

export const ourTurn = (state: ChannelState) => {
  if (!('turnNum' in state)) {
    return false;
  }
  return state.turnNum % 2 !== state.ourIndex;
};

export type ReducerWithSideEffects<T> = (
  state: T,
  action,
) => { state: T; outboxState?: OutboxState };
export function combineReducersWithSideEffects(reducers: {
  [branch: string]: ReducerWithSideEffects<any>;
}) {
  return (state, action) => {
    const nextState = { ...state };
    let outboxState = { ...state.outboxState };

    Object.keys(reducers).map(branch => {
      const reducer = reducers[branch];
      const { state: updatedState, outboxState: sideEffects } = reducer(state[branch], action);
      nextState[branch] = updatedState;
      outboxState = applySideEffects(outboxState, sideEffects);
    });
    return { ...nextState, outboxState };
  };
}
