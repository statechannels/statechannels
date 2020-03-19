import {State, ChannelConstants, Outcome, AllocationItem, SignedState} from './types';
import {
  State as NitroState,
  SignedState as NitroSignedState,
  Outcome as NitroOutcome,
  AllocationItem as NitroAllocationItem,
  signState as signNitroState,
  hashState as hashNitroState,
  getStateSignerAddress as getNitroSignerAddress,
  getChannelId,
  convertAddressToBytes32
} from '@statechannels/nitro-protocol';
import {joinSignature, splitSignature, bigNumberify} from 'ethers/utils';
import _ from 'lodash';

function toNitroState(state: State): NitroState {
  const {challengeDuration, appDefinition, channelNonce, participants, chainId} = state;
  const channel = {
    channelNonce: channelNonce.toString(),
    chainId,
    participants: participants.map(x => x.signingAddress)
  };

  return {
    appData: state.appData,
    isFinal: state.isFinal,
    outcome: convertToNitroOutcome(state.outcome),
    challengeDuration: challengeDuration.toNumber(),
    appDefinition,
    channel,
    turnNum: state.turnNum.toNumber()
  };
}

// Since the nitro signed state only contains one signature we may get multiple
// NitroSignedStates for a signed state with multiple signatures
export function toNitroSignedState(signedState: SignedState): NitroSignedState[] {
  const state = toNitroState(signedState);
  const {signatures} = signedState;
  return signatures.map(sig => ({state, signature: splitSignature(sig)}));
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

export function signState(state: State, privateKey: string): string {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return joinSignature(signature);
}

export function hashState(state: State): string {
  const nitroState = toNitroState(state);
  return hashNitroState(nitroState);
}

export function getSignerAddress(state: State, signature: string): string {
  const nitroState = toNitroState(state);
  return getNitroSignerAddress({state: nitroState, signature: splitSignature(signature)});
}

export function statesEqual(left: State, right: State) {
  return hashState(left) === hashState(right);
}

export function outcomesEqual(left: Outcome, right?: Outcome) {
  // TODO: do we need a more detailed check?
  return _.isEqual(left, right);
}

export const firstState = (
  outcome: Outcome,
  {channelNonce, chainId, challengeDuration, appDefinition, participants}: ChannelConstants,
  appData?: string
): State => ({
  appData: appData || '0x',
  isFinal: false,
  turnNum: bigNumberify(0),
  chainId: chainId || '0x01',
  channelNonce,
  challengeDuration,
  appDefinition,
  participants,
  outcome
});

function convertToNitroAllocationItems(allocationItems: AllocationItem[]): NitroAllocationItem[] {
  return allocationItems.map(a => ({
    amount: a.amount.toHexString(),
    destination:
      a.destination.length === 42 ? convertAddressToBytes32(a.destination) : a.destination
  }));
}

export function convertToNitroOutcome(outcome: Outcome): NitroOutcome {
  switch (outcome.type) {
    case 'SimpleAllocation':
      return [
        {
          assetHolderAddress: outcome.assetHolderAddress,
          allocationItems: convertToNitroAllocationItems(outcome.allocationItems)
        }
      ];
    case 'SimpleGuarantee':
      return [
        {
          assetHolderAddress: outcome.assetHolderAddress,
          guarantee: {
            targetChannelId: outcome.targetChannelId,
            destinations: outcome.destinations
          }
        }
      ];
    case 'MixedAllocation':
      return outcome.simpleAllocations.map(x => convertToNitroOutcome[0]);
  }
}

export function nextState(state: State, outcome: Outcome) {
  if (state.outcome.type !== outcome.type) {
    throw new Error('Attempting to change outcome type');
  }

  return {...state, turnNum: state.turnNum.add(1), outcome};
}
