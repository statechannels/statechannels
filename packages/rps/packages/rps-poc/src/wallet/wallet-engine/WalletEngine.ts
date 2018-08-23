import WalletEngineA from './WalletEngineA';
import WalletEngineB from './WalletEngineB';
import { Wallet } from '..';

export type WalletEngine = WalletEngineA | WalletEngineB;

export function setupWalletEngine(wallet: Wallet, playerIndex: number): WalletEngine {
  if (playerIndex === 0) {
    return WalletEngineA.setupWalletEngine(wallet);
  } else {
    return WalletEngineB.setupWalletEngine(wallet);
  }
}
