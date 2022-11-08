import {
  Allocation as NitroAllocation,
  State as NitroState,
  SignedState as NitroSignedState,
  Outcome as NitroOutcome,
  signState as signNitroState,
  hashState as hashNitroState,
  getStateSignerAddress as getNitroSignerAddress,
  getChannelId,
  convertAddressToBytes32
} from '@statechannels/nitro-protocol';
import * as _ from 'lodash';
import {Wallet, utils, BigNumber} from 'ethers';
import {AllocationType} from '@statechannels/exit-format';

import {
  Allocation,
  State,
  ChannelConstants,
  Outcome,
  SignedState,
  Destination,
  SignatureEntry,
  makeAddress,
  Address,
  Hashed,
  SingleAssetOutcome
} from './types';
import {BN} from './bignumber';

import {makeDestination} from './';

export function toNitroState(state: State): NitroState {
  const {channelNonce, participants, chainId} = state;
  const channel = {
    channelNonce,
    chainId,
    participants: participants.map(x => x.signingAddress)
  };

  return {
    ..._.pick(state, 'appData', 'isFinal', 'challengeDuration', 'appDefinition', 'turnNum'),
    outcome: convertToNitroOutcome(state.outcome),
    channel
  };
}

export function fromNitroSignedState(nitroSignedState: NitroSignedState): SignedState {
  const state = fromNitroState(nitroSignedState.state);
  const signature = utils.joinSignature(nitroSignedState.signature);
  const signatures: SignatureEntry[] = [
    {
      signature,
      signer: getSignerAddress(state, signature)
    }
  ];

  return {...state, signatures};
}

export function fromNitroState(state: NitroState): State {
  const {appData, isFinal, outcome, challengeDuration, appDefinition, channel, turnNum} = state;

  return {
    appDefinition: makeAddress(appDefinition),
    isFinal,
    appData,
    outcome: fromNitroOutcome(outcome),
    turnNum: turnNum,
    challengeDuration: challengeDuration,
    channelNonce: Number(channel.channelNonce),
    chainId: channel.chainId,
    participants: channel.participants.map(x => ({
      signingAddress: makeAddress(x),
      // FIXME: Get real values
      participantId: x,
      destination: x.padStart(64, '0') as Destination
    }))
  };
}

// Since the nitro signed state only contains one signature we may get multiple
// NitroSignedStates for a signed state with multiple signatures
export function toNitroSignedState(signedState: SignedState): NitroSignedState[] {
  const state = toNitroState(signedState);
  const {signatures} = signedState;
  return signatures.map(sig => ({state, signature: utils.splitSignature(sig.signature)}));
}

export function calculateChannelId(channelConstants: ChannelConstants): string {
  const {chainId, channelNonce, participants} = channelConstants;
  const addresses = participants.map(p => p.signingAddress);
  return getChannelId({chainId, channelNonce, participants: addresses});
}

export function createSignatureEntry(state: State, privateKey: string): SignatureEntry {
  const {address} = new Wallet(privateKey);
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return {signature: utils.joinSignature(signature), signer: makeAddress(address)};
}
export function signState(state: State, privateKey: string): string {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return utils.joinSignature(signature);
}

export function hashState(state: State): string {
  const nitroState = toNitroState(state);
  return hashNitroState(nitroState);
}

export function getSignerAddress(state: State, signature: string): Address {
  const nitroState = toNitroState(state);
  return makeAddress(
    getNitroSignerAddress({state: nitroState, signature: utils.splitSignature(signature)})
  );
}

export function statesEqual(left: State, right: State): boolean {
  return hashState(left) === hashState(right);
}

function singleAssetOutcomesEqual(left: SingleAssetOutcome, right: SingleAssetOutcome) {
  return (
    left.asset === right.asset &&
    left.allocations.length === right.allocations.length &&
    _.every(
      left.allocations,
      (value, index) =>
        value.destination === right.allocations[index].destination &&
        BN.eq(value.amount, right.allocations[index].amount)
    ) &&
    left.metadata === right.metadata
  );
}

export function outcomesEqual(left: Outcome, right?: Outcome): boolean {
  return (
    left.length === right?.length &&
    _.every(left, (_, index) => singleAssetOutcomesEqual(left[index], right[index]))
  );
}

export const firstState = (
  outcome: Outcome,
  {channelNonce, chainId, challengeDuration, appDefinition, participants}: ChannelConstants,
  appData?: string
): State => ({
  appData: appData || '0x',
  isFinal: false,
  turnNum: 0,
  chainId: chainId || '0x01',
  channelNonce,
  challengeDuration,
  appDefinition,
  participants,
  outcome
});

function convertToNitroAllocations(allocations: Allocation[]): NitroAllocation[] {
  return allocations.map(a => ({
    allocationType: a.allocationType ?? AllocationType.simple,
    metadata: a.metadata ?? '0x',
    amount: a.amount,
    destination:
      a.destination.length === 42 ? convertAddressToBytes32(a.destination) : a.destination
  }));
}

function convertFromNitroAllocations(allocations: NitroAllocation[]): Allocation[] {
  return allocations.map(a => ({
    amount: BN.from(a.amount),
    destination: makeDestination(a.destination),
    metadata: a.metadata as string, // TODO
    allocationType: a.allocationType
  }));
}

export function convertToNitroOutcome(outcome: Outcome): NitroOutcome {
  return outcome.map(o => ({
    asset: o.asset,
    allocations: convertToNitroAllocations(o.allocations),
    metadata: o.metadata ?? '0x'
  }));
}

export function fromNitroOutcome(outcome: NitroOutcome): Outcome {
  return outcome.map(o => ({
    asset: makeAddress(o.asset),
    allocations: convertFromNitroAllocations(o.allocations),
    metadata: BigNumber.from(o.metadata).toString()
  }));
}

export function nextState(state: State, outcome: Outcome): State {
  return {...state, turnNum: state.turnNum + 1, outcome};
}

export const addHash = <T extends State = State>(s: T): T & Hashed => ({
  ...s,
  stateHash: hashState(s)
});
