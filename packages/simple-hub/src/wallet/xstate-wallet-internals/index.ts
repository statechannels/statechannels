import {utils, BigNumber} from 'ethers';
import _ from 'lodash';
import {
  SignedState as SignedStateWire,
  Message as WireMessage,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  isAllocations,
  Guarantee as GuaranteeWire
} from '@statechannels/wire-format';
import {
  convertAddressToBytes32,
  getChannelId,
  signState as signNitroState,
  AllocationItem as NitroAllocationItem,
  Outcome as NitroOutcome,
  State as NitroState
} from '@statechannels/nitro-protocol';

import {log} from '../../logger';

function bnToPaddedHexString(bn: BigNumber, padding = 32): string {
  return utils.hexZeroPad(bn.toHexString(), padding);
}

interface AllocationItem {
  destination: string;
  amount: BigNumber;
}

export interface SimpleAllocation {
  type: 'SimpleAllocation';
  assetHolderAddress: string;
  allocationItems: AllocationItem[];
}

interface SimpleGuarantee {
  type: 'SimpleGuarantee';
  targetChannelId: string;
  assetHolderAddress: string;
  destinations: string[];
}

interface MixedAllocation {
  type: 'MixedAllocation';
  simpleAllocations: SimpleAllocation[];
}

type Allocation = SimpleAllocation | MixedAllocation;
export type Outcome = Allocation | SimpleGuarantee;

interface StateVariables {
  outcome: Outcome;
  turnNum: number;
  appData: string;
  isFinal: boolean;
}

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: number;
  appDefinition: string;
  challengeDuration: number;
}

export interface State extends ChannelConstants, StateVariables {}

interface Signed {
  signatures: string[];
}

type _Objective<Name, Data> = {
  participants: Participant[];
  type: Name;
  data: Data;
};

type OpenChannel = _Objective<
  'OpenChannel',
  {
    targetChannelId: string;
    fundingStrategy: 'Direct' | 'Virtual' | 'Ledger';
  }
>;
type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {
    targetChannelId: string;
    jointChannelId: string;
  }
>;
type FundGuarantor = _Objective<
  'FundGuarantor',
  {
    jointChannelId: string;
    ledgerId: string;
    guarantorId: string;
  }
>;
type FundLedger = _Objective<
  'FundLedger',
  {
    ledgerId: string;
  }
>;
type CloseLedger = _Objective<
  'CloseLedger',
  {
    ledgerId: string;
  }
>;
export type Objective = OpenChannel | VirtuallyFund | FundGuarantor | FundLedger | CloseLedger;

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
export interface SignedState extends State, Signed {}
export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}

function deserializeState(state: SignedStateWire): SignedState {
  return {..._.omit(state, 'channelId'), outcome: deserializeOutcome(state.outcome)};
}

function deserializeOutcome(outcome: OutcomeWire): Outcome {
  if (isAllocations(outcome)) {
    switch (outcome.length) {
      case 0:
        // TODO: specify in wire format
        throw new Error('Empty allocation');
      case 1:
        return deserializeAllocation(outcome[0]);
      default:
        return {
          type: 'MixedAllocation',
          simpleAllocations: outcome.map(deserializeAllocation)
        };
    }
  } else {
    if (outcome.length !== 1) {
      throw new Error('Currently only supporting guarantees of length 1.');
    } else {
      return {
        type: 'SimpleGuarantee',
        ...outcome[0]
      };
    }
  }

  // either an outcome is all guarantees or all
}

function deserializeAllocation(allocation: AllocationWire): SimpleAllocation {
  const {assetHolderAddress, allocationItems} = allocation;
  return {
    type: 'SimpleAllocation',
    assetHolderAddress,
    allocationItems: allocationItems.map(deserializeAllocationItem)
  };
}

function deserializeAllocationItem(allocationItem: AllocationItemWire): AllocationItem {
  const {amount, destination} = allocationItem;
  return {destination, amount: BigNumber.from(amount)};
}

function serializeOutcome(outcome: Outcome): OutcomeWire {
  switch (outcome.type) {
    case 'SimpleAllocation':
      return [serializeSimpleAllocation(outcome)];
    case 'MixedAllocation':
      return outcome.simpleAllocations.map(serializeSimpleAllocation);
    case 'SimpleGuarantee':
      return [serializeSimpleGuarantee(outcome)];
  }
}

function serializeSimpleGuarantee(guarantee: SimpleGuarantee): GuaranteeWire {
  return {
    assetHolderAddress: guarantee.assetHolderAddress,
    targetChannelId: guarantee.targetChannelId,
    destinations: guarantee.destinations.map(makeDestination)
  };
}
function serializeSimpleAllocation(allocation: SimpleAllocation): AllocationWire {
  return {
    assetHolderAddress: allocation.assetHolderAddress,
    allocationItems: allocation.allocationItems.map(serializeAllocationItem)
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AllocationItemWire {
  const {destination, amount} = allocationItem;
  return {destination, amount: bnToPaddedHexString(amount)};
}

function serializeState(state: SignedState): SignedStateWire {
  return {...state, outcome: serializeOutcome(state.outcome), channelId: calculateChannelId(state)};
}

export function calculateChannelId(channelConstants: ChannelConstants): string {
  const {chainId, channelNonce, participants} = channelConstants;
  const addresses = participants.map(p => p.signingAddress);
  return getChannelId({chainId, channelNonce, participants: addresses});
}

export function deserializeMessage(message: WireMessage): Message {
  const signedStates = (message.data.signedStates || []).map(ss => deserializeState(ss));
  const {objectives} = message.data;
  return {
    signedStates,
    objectives
  };
}

export function serializeMessage(message: Message, recipient: string, sender: string): WireMessage {
  const signedStates = (message.signedStates || []).map(ss => serializeState(ss));
  const {objectives} = message;
  return {
    recipient,
    sender,
    data: {signedStates, objectives}
  };
}

function convertToNitroOutcome(outcome: Outcome): NitroOutcome {
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
      // TODO: Update NitroOutcome to support multiple asset holders
      log.log('NOTE: MixedAllocation is using 0th-indexed allocation only');
      return outcome.simpleAllocations.map(convertToNitroOutcome)[0];
  }
}

function convertToNitroAllocationItems(allocationItems: AllocationItem[]): NitroAllocationItem[] {
  return allocationItems.map(a => ({
    amount: a.amount.toHexString(),
    destination:
      a.destination.length === 42 ? convertAddressToBytes32(a.destination) : a.destination
  }));
}

function toNitroState(state: State): NitroState {
  const {
    challengeDuration,
    appDefinition,
    channelNonce,
    participants,
    chainId,
    appData,
    turnNum,
    isFinal
  } = state;
  const channel = {channelNonce, chainId, participants: participants.map(x => x.signingAddress)};

  return {
    challengeDuration,
    appDefinition,
    appData,
    outcome: convertToNitroOutcome(state.outcome),
    channel,
    turnNum,
    isFinal
  };
}

export function signState(state: State, privateKey: string): string {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return utils.joinSignature(signature);
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

export function makeDestination(addressOrDestination: string): string {
  if (addressOrDestination.length === 42) {
    return utils.hexZeroPad(utils.getAddress(addressOrDestination), 32);
  } else if (addressOrDestination.length === 66) {
    return addressOrDestination;
  } else {
    throw new Error('Invalid input');
  }
}
