import {Wallet} from 'ethers';
import {Address, makeAddress, State, toNitroState} from '@statechannels/wallet-core';
import * as wasmUtils from '@statechannels/wasm-utils';
import {State as NitroState} from '@statechannels/nitro-protocol';

const knownWallets: Record<string, Address> = {};
const cachedAddress = (privateKey: string): Address =>
  knownWallets[privateKey] ||
  (knownWallets[privateKey] = makeAddress(new Wallet(privateKey).address));

export function signState(state: State, privateKey: string): {state: State; signature: string} {
  const address = cachedAddress(privateKey);
  if (state.participants.map(p => p.signingAddress).indexOf(address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const signature = wasmUtils.signState(toNitroState(state), privateKey).signature;
  return {state, signature};
}

export function recoverAddress(signature: string, state: NitroState): Address {
  return makeAddress(wasmUtils.recoverAddress(state, signature));
}
