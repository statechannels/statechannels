import { SharedWalletState } from './shared';
import { InitializingState } from './initializing';
import { InitializedState } from './initialized';

export * from './initialized';
export * from './initializing';

export { SharedWalletState };

export type WalletState = InitializingState | InitializedState;
