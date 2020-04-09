import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  Guarantee as GuaranteeWire,
  Message as WireMessage
} from '@statechannels/wire-format';
import {
  SignedState,
  Outcome,
  AllocationItem,
  SimpleAllocation,
  Message,
  SimpleGuarantee
} from '../../store/types';
import {calculateChannelId} from '../../store/state-utils';
import {BigNumber, hexZeroPad, hexlify} from 'ethers/utils';
import {makeDestination} from '../../utils';

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

function serializeSimpleGuarantee(guarantee: SimpleGuarantee): GuaranteeWire {
  return {
    assetHolderAddress: guarantee.assetHolderAddress,
    targetChannelId: guarantee.targetChannelId,
    destinations: guarantee.destinations
  };
}

function serializeAllocationItem(allocationItem: AllocationItem): AllocationItemWire {
  const {destination, amount} = allocationItem;
  return {destination, amount: bigNumberToUint256(amount)};
}
