import { AdjudicatorKnown, adjudicatorKnown } from '../shared/state';

// stage
export const WALLET_INITIALIZED = 'WALLET.INITIALIZED';

export interface Initialized extends AdjudicatorKnown {
  stage: typeof WALLET_INITIALIZED;
  type: typeof WALLET_INITIALIZED;
}

export function initialized<T extends AdjudicatorKnown>(params: T): Initialized {
  const { outboxState, uid } = params;
  return {
    ...adjudicatorKnown(params),
    stage: WALLET_INITIALIZED,
    type: WALLET_INITIALIZED,
    outboxState,
    uid,
  };
}

export type InitializedState = Initialized;
