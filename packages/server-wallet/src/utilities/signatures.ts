import {Wallet} from 'ethers';
import {State, StateWithHash} from '@statechannels/wallet-core';
import * as wasmUtils from '@statechannels/wasm-utils';

const knownWallets: Record<string, string> = {};
const cachedAddress = (privateKey: string): string =>
  knownWallets[privateKey] || (knownWallets[privateKey] = new Wallet(privateKey).address);

export async function signState(
  state: StateWithHash,
  privateKey: string
): Promise<{state: State; signature: string}> {
  const address = cachedAddress(privateKey);
  if (state.participants.map(p => p.signingAddress).indexOf(address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const {stateHash} = state;

  const signature = await wasmUtils.signState(stateHash, privateKey);
  return {state, signature};
}
