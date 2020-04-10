import {
  bigNumberify,
  joinSignature,
  BigNumber,
  hexZeroPad,
  hexlify,
  splitSignature
} from 'ethers/utils';
import {
  SignedState as SignedStateWire,
  Message as WireMessage,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  Objective as ObjectiveWire,
  isAllocations,
  Guarantee as GuaranteeWire
} from '@statechannels/wire-format';
import {
  convertAddressToBytes32,
  signState as signNitroState,
  AllocationItem as NitroAllocationItem,
  Outcome as NitroOutcome,
  State as NitroState,
  getStateSignerAddress as getNitroSignerAddress,
  getChannelId
} from '@statechannels/nitro-protocol';
import {ethers, Wallet} from 'ethers';

export interface SiteBudget {
  domain: string;
  hubAddress: string;
  forAsset: Record<string, AssetBudget | undefined>;
}

interface ChannelBudgetEntry {
  amount: BigNumber;
}
export interface AssetBudget {
  assetHolderAddress: string;
  availableReceiveCapacity: BigNumber;
  availableSendCapacity: BigNumber;
  channels: Record<string, ChannelBudgetEntry>;
}
export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: Destination;
}
// signers

export interface StateVariables {
  outcome: Outcome;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}
export type StateVariablesWithHash = StateVariables & Hashed;
export type Destination = string & {_isDestination: void};
export interface AllocationItem {
  destination: Destination;
  amount: BigNumber;
}
export interface SimpleAllocation {
  type: 'SimpleAllocation';
  assetHolderAddress: string;
  allocationItems: AllocationItem[];
}
export interface SimpleGuarantee {
  type: 'SimpleGuarantee';
  targetChannelId: string;
  assetHolderAddress: string;
  destinations: string[];
}
export interface MixedAllocation {
  type: 'MixedAllocation';
  simpleAllocations: SimpleAllocation[];
}

// Should we even have these two different types??
export type Allocation = SimpleAllocation | MixedAllocation;
export type Outcome = Allocation | SimpleGuarantee;

export function isAllocation(outcome: Outcome): outcome is Allocation {
  return outcome.type !== 'SimpleGuarantee';
}

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {}
export interface SignatureEntry {
  signature: string;
  signer: string;
}

interface Signed {
  signatures: SignatureEntry[];
}
interface Hashed {
  stateHash: string;
}
export type SignedState = State & Signed;
export type SignedStateWithHash = SignedState & Hashed;

export type SignedStateVariables = StateVariables & Signed;
export type SignedStateVarsWithHash = SignedStateVariables & Hashed;

type _Objective<Name, Data> = {
  participants: Participant[];
  type: Name;
  data: Data;
};
export type OpenChannel = _Objective<
  'OpenChannel',
  {
    targetChannelId: string;
    fundingStrategy: 'Direct' | 'Ledger' | 'Virtual';
  }
>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {
    targetChannelId: string;
    jointChannelId: string;
  }
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {
    jointChannelId: string;
    ledgerId: string;
    guarantorId: string;
  }
>;
export type FundLedger = _Objective<
  'FundLedger',
  {
    ledgerId: string;
  }
>;
export type CloseLedger = _Objective<
  'CloseLedger',
  {
    ledgerId: string;
  }
>;
export type Objective = OpenChannel | VirtuallyFund | FundGuarantor | FundLedger | CloseLedger;

const guard = <T extends Objective>(name: Objective['type']) => (o: Objective): o is T =>
  o.type === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');
export const isFundLedger = guard<FundLedger>('FundLedger');
export const isCloseLedger = guard<CloseLedger>('CloseLedger');

export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}
export function deserializeMessage(message: WireMessage): Message {
  const signedStates = message?.data?.signedStates?.map(ss => deserializeState(ss));
  const objectives = message?.data?.objectives?.map(objective => deserializeObjective(objective));

  return {
    signedStates,
    objectives
  };
}

export function deserializeState(state: SignedStateWire): SignedState {
  const stateWithoutChannelId = {...state};
  delete stateWithoutChannelId.channelId;
  const deserializedState = {
    ...stateWithoutChannelId,
    challengeDuration: bigNumberify(state.challengeDuration),
    channelNonce: bigNumberify(state.channelNonce),
    turnNum: bigNumberify(state.turnNum),
    outcome: deserializeOutcome(state.outcome),
    participants: stateWithoutChannelId.participants.map(convertToInternalParticipant)
  };

  return {
    ...deserializedState,
    signatures: state.signatures.map(sig => ({
      signature: sig,
      signer: getSignerAddress(deserializedState, sig)
    }))
  };
}

export function deserializeObjective(objective: ObjectiveWire): Objective {
  return {
    ...objective,
    participants: objective.participants.map(p => ({
      ...p,
      destination: makeDestination(p.destination)
    }))
  };
}
// where do I move between token and asset holder?
// I have to have asset holder between the wallets, otherwise there is ambiguity
// I don't want asset holders in the json rpc layer, as the client shouldn't care

export function deserializeOutcome(outcome: OutcomeWire): Outcome {
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
  return {destination: makeDestination(destination), amount: bigNumberify(amount)};
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
      return outcome.simpleAllocations.map(() => convertToNitroOutcome[0]);
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

export function signState(state: State, privateKey: string): SignatureEntry {
  const nitroState = toNitroState(state);
  const {signature} = signNitroState(nitroState, privateKey);
  const signer = new Wallet(privateKey).address;
  return {signature: joinSignature(signature), signer};
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

export function makeDestination(addressOrDestination: string): Destination {
  if (addressOrDestination.length === 42) {
    return ethers.utils.hexZeroPad(
      ethers.utils.getAddress(addressOrDestination),
      32
    ) as Destination;
  } else if (addressOrDestination.length === 66) {
    return addressOrDestination as Destination;
  } else {
    throw new Error('Invalid input');
  }
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

function bigNumberToUint256(bigNumber: BigNumber): string {
  return hexZeroPad(hexlify(bigNumber), 32);
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

export function serializeState(state: SignedState): SignedStateWire {
  const {appData, appDefinition, isFinal, chainId, participants} = state;
  return {
    challengeDuration: bigNumberToUint256(state.challengeDuration),
    channelNonce: bigNumberToUint256(state.channelNonce),
    turnNum: bigNumberToUint256(state.turnNum),
    outcome: serializeOutcome(state.outcome),
    channelId: calculateChannelId(state),
    signatures: state.signatures.map(s => s.signature),
    appData,
    appDefinition,
    isFinal,
    chainId,
    participants
  };
}

export function serializeOutcome(outcome: Outcome): OutcomeWire {
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
  return {destination, amount: bigNumberToUint256(amount)};
}
export function convertToInternalParticipant(participant: {
  destination: string;
  signingAddress: string;
  participantId: string;
}): Participant {
  return {
    ...participant,
    destination: makeDestination(participant.destination)
  };
}

export function getSignerAddress(state: State, signature: string): string {
  const nitroState = toNitroState(state);
  return getNitroSignerAddress({state: nitroState, signature: splitSignature(signature)});
}
