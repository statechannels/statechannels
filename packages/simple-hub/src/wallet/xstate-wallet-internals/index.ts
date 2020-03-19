import {bigNumberify, joinSignature, BigNumber} from 'ethers/utils';
import {
  SignedState as SignedStateWire,
  Message as WireMessage,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  isAllocations
} from '@statechannels/wire-format';
import {
  convertAddressToBytes32,
  getChannelId,
  signState as signNitroState,
  AllocationItem as NitroAllocationItem,
  Outcome as NitroOutcome,
  State as NitroState
} from '@statechannels/nitro-protocol';

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
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
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
  const stateWithoutChannelId = {...state};
  delete stateWithoutChannelId.channelId;

  return {
    ...stateWithoutChannelId,
    challengeDuration: bigNumberify(state.challengeDuration),
    channelNonce: bigNumberify(state.channelNonce),
    turnNum: bigNumberify(state.turnNum),
    outcome: deserializeOutcome(state.outcome)
  };
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
  return {destination, amount: bigNumberify(amount)};
}

function serializeOutcome(outcome: Outcome): OutcomeWire {
  switch (outcome.type) {
    case 'SimpleAllocation':
      return [serializeSimpleAllocation(outcome)];
    case 'MixedAllocation':
      return outcome.simpleAllocations.map(serializeSimpleAllocation);
    case 'SimpleGuarantee':
      // TODO
      return [];
  }
}

function serializeSimpleAllocation(allocation: SimpleAllocation): AllocationWire {
  return {
    assetHolderAddress: allocation.assetHolderAddress,
    allocationItems: allocation.allocationItems.map(serializeAllocationItem)
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AllocationItemWire {
  const {destination, amount} = allocationItem;
  return {destination, amount: amount.toHexString()};
}

function serializeState(state: SignedState): SignedStateWire {
  return {
    ...state,
    challengeDuration: state.challengeDuration.toHexString(),
    channelNonce: state.channelNonce.toHexString(),
    turnNum: state.turnNum.toHexString(),
    outcome: serializeOutcome(state.outcome),
    channelId: calculateChannelId(state)
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

export function deserializeMessage(message: WireMessage): Message {
  const signedStates = (message.data.signedStates || []).map(ss => {
    return deserializeState(ss);
  });
  const {objectives} = message.data;
  return {
    signedStates,
    objectives
  };
}

export function serializeMessage(message: Message, recipient: string, sender: string): WireMessage {
  const signedStates = (message.signedStates || []).map(ss => {
    return serializeState(ss);
  });
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
      // todo: this looks incorrect
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return outcome.simpleAllocations.map(x => convertToNitroOutcome[0]);
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

export function signState(state: State, privateKey: string): string {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  return joinSignature(signature);
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
