import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  Allocation as AllocationWire,
  SingleAssetOutcome as SingleAssetOutcomeWire,
  Message as WireMessage
} from '@statechannels/wire-format';

import {SignedState, Outcome, Allocation, Payload, SingleAssetOutcome} from '../../types';
import {calculateChannelId} from '../../state-utils';
import {formatAmount} from '../../utils';

export function serializeMessage(
  walletVersion: string,
  message: Payload,
  recipient: string,
  sender?: string,
  channelId?: string
): WireMessage {
  const signedStates = (message.signedStates || []).map(s => serializeState(s, channelId));
  const {objectives, requests} = message;
  return {
    recipient,
    sender,
    data: {walletVersion, signedStates, objectives, requests}
  };
}

export function serializeState(state: SignedState, channelId?: string): SignedStateWire {
  const {
    chainId,
    participants,
    channelNonce,
    appDefinition,
    challengeDuration,
    turnNum,
    appData,
    isFinal
  } = state;

  return {
    chainId,
    participants,
    channelNonce,
    appDefinition,
    challengeDuration,
    turnNum,
    appData,
    isFinal,
    outcome: serializeOutcome(state.outcome),
    channelId: channelId || calculateChannelId(state),
    signatures: state.signatures.map(s => s.signature)
  };
}

export function serializeOutcome(outcome: Outcome): OutcomeWire {
  return outcome.map(serializeSingleAssetOutcome);
}

function serializeSingleAssetOutcome(
  singleAssetOutcome: SingleAssetOutcome
): SingleAssetOutcomeWire {
  return {
    asset: singleAssetOutcome.asset,
    metadata: singleAssetOutcome.metadata ?? '0x',
    allocations: singleAssetOutcome.allocations.map(serializeAllocation)
  };
}

function serializeAllocation(allocation: Allocation): AllocationWire {
  const {destination, amount, metadata, allocationType} = allocation;
  return {
    destination,
    amount: formatAmount(amount),
    metadata: metadata ?? '0x',
    allocationType: allocationType ?? 0
  };
}
