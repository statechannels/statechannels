import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  AllocationItem as AllocationItemWire,
  Allocation as AllocationWire,
  Message as WireMessage
} from '@statechannels/wire-format';
import {SignedState, Outcome, AllocationItem, SimpleAllocation, Message} from '../../store/types';
import {calculateChannelId} from '../../store/state-utils';
import {BigNumber} from 'ethers/utils';

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

function bigNumberToUint256(bigNumber: BigNumber): string {
  return (
    '0x' +
    bigNumber
      .toHexString()
      .slice(2)
      .padStart(64, '0')
  );
}
export function serializeState(state: SignedState): SignedStateWire {
  const sswire = {
    ...state,
    challengeDuration: bigNumberToUint256(state.challengeDuration),
    channelNonce: bigNumberToUint256(state.channelNonce),
    turnNum: bigNumberToUint256(state.turnNum),
    outcome: serializeOutcome(state.outcome),
    channelId: calculateChannelId(state)
  };
  console.log('serializing' + JSON.stringify(state) + ' to ' + JSON.stringify(sswire));
  return sswire;
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
  return {destination, amount: bigNumberToUint256(amount)};
}
