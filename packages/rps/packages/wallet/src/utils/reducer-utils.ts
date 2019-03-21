import { Commitment } from 'fmg-core';
import { ChannelStatus } from '../redux/channelState/state';
import { channelID } from 'fmg-core/lib/channel';
import { applySideEffects } from '../redux/outbox';
import { OutboxState } from 'src/redux/outbox/state';
import { WalletAction } from 'src/redux/actions';

export function unreachable(x: never) {
  return x;
}

export const validTransition = (fromState: ChannelStatus, toCommitment: Commitment) => {
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

export const ourTurn = (state: ChannelStatus) => {
  if (!('turnNum' in state)) {
    return false;
  }
  return state.turnNum % 2 !== state.ourIndex;
};

export type ReducersMapObject<S = any, A extends WalletAction = WalletAction> = {
  [K in keyof S]: ReducerWithSideEffects<S[K], A>
};

export type ReducerWithSideEffects<Tree, A extends WalletAction = WalletAction> = (
  state: Tree,
  action: A,
  data?: any,
) => { state: Tree; outboxState?: OutboxState };

export function combineReducersWithSideEffects<Tree, A extends WalletAction>(
  reducers: ReducersMapObject<Tree, A>,
) {
  return (state: Tree, action: A, data?: { [Branch in keyof Tree]?: any }) => {
    const nextState = { ...state };
    let outboxState = {};

    Object.keys(reducers).map(branch => {
      const reducer = reducers[branch];
      let result;
      if (data && data[branch]) {
        result = reducer(state[branch], action, data[branch]);
      } else {
        result = reducer(state[branch], action);
      }
      const { state: updatedState, outboxState: sideEffects } = result;
      nextState[branch] = updatedState;
      outboxState = applySideEffects(outboxState, sideEffects);
    });
    return { state: { ...nextState }, outboxState };
  };
}
