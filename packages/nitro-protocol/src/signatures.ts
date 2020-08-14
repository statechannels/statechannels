import {ethers, Wallet, utils} from 'ethers';
import {hashPersonalMessage, ecsign} from 'ethereumjs-util';

import {hashChallengeMessage} from './contract/challenge';
import {getChannelId} from './contract/channel';
import {hashState, State} from './contract/state';
// This is the same as the ethers Signature type
// But we redefine it here to prevent the below issue
// for consumers of this package:
// https://github.com/ethers-io/ethers.js/issues/349
export interface Signature {
  r: string;
  s: string;

  v?: number;
}

export interface SignedState {
  state: State;
  signature: Signature;
}

export function getStateSignerAddress(signedState: SignedState): string {
  const stateHash = hashState(signedState.state);
  const recoveredAddress = utils.verifyMessage(utils.arrayify(stateHash), signedState.signature);
  const {channel} = signedState.state;
  const {participants} = channel;

  if (participants.indexOf(recoveredAddress) < 0) {
    throw new Error(
      `Recovered address ${recoveredAddress} is not a participant in channel ${getChannelId(
        channel
      )}`
    );
  }
  return recoveredAddress;
}

export function signState(state: State, privateKey: string): SignedState {
  const wallet = new Wallet(privateKey);
  if (state.channel.participants.indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }

  const hashedState = hashState(state);

  const signature = signData(hashedState, privateKey);
  return {state, signature};
}

export async function sign(wallet: Wallet, msgHash: string | Uint8Array) {
  // MsgHash is a hex string
  // Returns an object with v, r, and s properties.
  return utils.splitSignature(await wallet.signMessage(utils.arrayify(msgHash)));
}

export async function signStates(
  states: State[],
  wallets: Wallet[],
  whoSignedWhat: number[]
): Promise<utils.Signature[]> {
  const stateHashes = states.map(s => hashState(s));
  const promises = wallets.map(async (w, i) => await sign(w, stateHashes[whoSignedWhat[i]]));
  return Promise.all(promises);
}

export function signChallengeMessage(
  signedStates: SignedState[],
  privateKey: string
): utils.Signature {
  if (signedStates.length === 0) {
    throw new Error('At least one signed state must be provided');
  }
  const wallet = new Wallet(privateKey);
  if (signedStates[0].state.channel.participants.indexOf(wallet.address) < 0) {
    throw new Error("The state must be signed with a participant's private key");
  }
  const challengeState = signedStates[signedStates.length - 1].state;
  const challengeHash = hashChallengeMessage(challengeState);

  return signData(challengeHash, privateKey);
}

function signData(hashedData: string, privateKey: string): utils.Signature {
  const signature = ecsign(
    hashPersonalMessage(Buffer.from(hashedData.substr(2), 'hex')),
    Buffer.from(privateKey.substr(2), 'hex')
  );
  return {
    r: `0x${signature.r.toString('hex')}`,
    s: `0x${signature.s.toString('hex')}`,
    v: signature.v,
  };
}
