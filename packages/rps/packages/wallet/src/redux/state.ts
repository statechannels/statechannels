import { SharedWalletState } from './shared/state';
import { InitializingState } from './initializing/state';
import { InitializedState } from './initialized/state';

export * from './initialized/state';
export * from './initializing/state';

export { SharedWalletState };

export type WalletState = InitializingState | InitializedState;
