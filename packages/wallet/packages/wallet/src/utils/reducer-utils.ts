import { Commitment } from 'fmg-core';
import { ChannelStatus } from '../redux/channel-state/state';
import { channelID } from 'fmg-core/lib/channel';
import { accumulateSideEffects } from '../redux/outbox';
import { SideEffects } from 'src/redux/outbox/state';
import { WalletAction } from 'src/redux/actions';
import { StateWithSideEffects } from 'src/redux/utils';

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

export type ReducersMapObject<Tree = any, A extends WalletAction = WalletAction> = {
  [Branch in keyof Tree]: ReducerWithSideEffects<Tree[Branch], A>
};

export type ReducerWithSideEffects<T, A extends WalletAction = WalletAction> = (
  state: T,
  action: A,
  data?: any,
) => StateWithSideEffects<T>;

export function combineReducersWithSideEffects<Tree, A extends WalletAction>(
  reducers: ReducersMapObject<Tree, A>,
): ReducerWithSideEffects<Tree> {
  return (state: Tree, action: A, data?: { [Branch in keyof Tree]?: any }) => {
    const nextState = { ...state };
    let sideEffects: SideEffects = {};

    Object.keys(reducers).map(branch => {
      const reducer = reducers[branch];
      let result;
      if (data && data[branch]) {
        result = reducer(state[branch], action, data[branch]);
      } else {
        result = reducer(state[branch], action);
      }
      const { state: updatedState, sideEffects: nextSideEffects } = result;
      nextState[branch] = updatedState;
      sideEffects = accumulateSideEffects(sideEffects, nextSideEffects);
    });
    return { state: { ...nextState }, sideEffects };
  };
}
