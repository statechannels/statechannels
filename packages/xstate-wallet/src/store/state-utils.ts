import {StateWithoutChannelId, ChannelConstants, Outcome, StateVariables} from './types';
import {convertToNitroOutcome} from './outcome-utils';
import {
  State as NitroState,
  signState as signNitroState,
  hashState as hashNitroState,
  getStateSignerAddress as getNitroSignerAddress,
  getChannelId
} from '@statechannels/nitro-protocol';
import {joinSignature, splitSignature} from 'ethers/utils';

export function toNitroState(state: StateWithoutChannelId): NitroState {
  const {challengeDuration, appDefinition, channelNonce, participants, chainId} = state;
  const channel = {
    channelNonce: channelNonce.toString(),
    chainId,
    participants: participants.map(x => x.signingAddress)
  };

  return {
    ...state,
    outcome: convertToNitroOutcome(state.outcome),
    challengeDuration: challengeDuration.toNumber(),
    appDefinition,
    channel,
    turnNum: state.turnNum.toNumber()
  };
}

export function calculateChannelId(channelConstants: ChannelConstants): string {
  const {chainId, channelNonce, participants} = channelConstants;
  const addresses = participants.map(p => p.signingAddress);
  return getChannelId({
    chainId,
    channelNonce: channelNonce.toString(),
    participants: addresses
  });
}

export function signState(state: StateWithoutChannelId, privateKey: string): string {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return joinSignature(signature);
}

export function hashState(state: StateWithoutChannelId): string {
  const nitroState = toNitroState(state);
  return hashNitroState(nitroState);
}

export function getSignerAddress(state: StateWithoutChannelId, signature: string): string {
  const nitroState = toNitroState(state);
  return getNitroSignerAddress({state: nitroState, signature: splitSignature(signature)});
}

export function statesEqual(
  constants: ChannelConstants,
  left: StateVariables,
  right?: StateVariables
): boolean {
  return right ? hashState({...left, ...constants}) === hashState({...right, ...constants}) : false;
}

export function outcomesEqual(left: Outcome, right?: Outcome) {
  throw 'unimplemented';
}
