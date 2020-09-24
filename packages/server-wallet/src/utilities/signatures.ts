import {Wallet} from 'ethers';
import {State, toNitroState} from '@statechannels/wallet-core';
import * as wasmUtils from '@statechannels/wasm-utils';
import {State as NitroState} from '@statechannels/nitro-protocol';

const knownWallets: Record<string, string> = {};
const cachedAddress = (privateKey: string): string =>
  knownWallets[privateKey] || (knownWallets[privateKey] = new Wallet(privateKey).address);

export async function signState(
  state: State,
  privateKey: string
): Promise<{state: State; signature: string}> {
  const address = cachedAddress(privateKey);
  if (state.participants.map(p => p.signingAddress).indexOf(address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const signature = await wasmUtils.signState(toNitroState(state), privateKey).signature;
  return {state, signature};
}

export function recoverAddress(signature: string, state: NitroState): string {
  return wasmUtils.recoverAddress(state, signature);
}
