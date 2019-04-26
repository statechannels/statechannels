import { accumulateSideEffects } from '../redux/outbox';
import { SideEffects } from 'src/redux/outbox/state';
import { WalletAction } from 'src/redux/actions';
import { StateWithSideEffects } from 'src/redux/utils';

export function unreachable(x: never) {
  return x;
}

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
