import {State, ChannelConstants, Outcome, AllocationItem, SignedState, Destination} from './types';
import {
  State as NitroState,
  SignedState as NitroSignedState,
  Outcome as NitroOutcome,
  AllocationItem as NitroAllocationItem,
  signState as signNitroState,
  hashState as hashNitroState,
  getStateSignerAddress as getNitroSignerAddress,
  getChannelId,
  convertAddressToBytes32,
  convertBytes32ToAddress
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

export function fromNitroState(state: NitroState): State {
  const {appData, isFinal, outcome, challengeDuration, appDefinition, channel, turnNum} = state;

  return {
    appDefinition,
    isFinal,
    appData,
    outcome: fromNitroOutcome(outcome),
    turnNum: bigNumberify(turnNum),
    challengeDuration: bigNumberify(challengeDuration),
    channelNonce: bigNumberify(channel.channelNonce),
    chainId: channel.chainId,
    participants: channel.participants.map(x => ({
      signingAddress: x,
      // FIXME: Get real values
      participantId: x,
      destination: x as Destination
    }))
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

function convertFromNitroAllocationItems(allocationItems: NitroAllocationItem[]): AllocationItem[] {
  return allocationItems.map(a => ({
    amount: bigNumberify(a.amount),
    destination:
      a.destination.substr(2, 22) === '00000000000000000000'
        ? (convertBytes32ToAddress(a.destination) as Destination)
        : (a.destination as Destination)
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
      // FIXME: is this a typo?
      return outcome.simpleAllocations.map(x => convertToNitroOutcome[0]);
  }
}

export function fromNitroOutcome(outcome: NitroOutcome): Outcome {
  const [singleOutcomeItem] = outcome;

  if (typeof singleOutcomeItem['allocationItems'] !== 'undefined') {
    return {
      type: 'SimpleAllocation',
      assetHolderAddress: singleOutcomeItem.assetHolderAddress,
      allocationItems: convertFromNitroAllocationItems(singleOutcomeItem['allocationItems'])
    };
  }

  if (typeof singleOutcomeItem['guarantee'] !== 'undefined') {
    return {
      type: 'SimpleGuarantee',
      assetHolderAddress: singleOutcomeItem.assetHolderAddress,
      targetChannelId: singleOutcomeItem['guarantee'].targetChannelId,
      destinations: singleOutcomeItem['guarantee'].destinations
    };
  }

  return {
    type: 'MixedAllocation',
    // FIXME: Figure out what needs to be here
    simpleAllocations: []
    // simpleAllocations: outcome.map(fromNitroOutcome)
  };
}

export function nextState(state: State, outcome: Outcome) {
  if (state.outcome.type !== outcome.type) {
    throw new Error('Attempting to change outcome type');
  }

  return {...state, turnNum: state.turnNum.add(1), outcome};
}
