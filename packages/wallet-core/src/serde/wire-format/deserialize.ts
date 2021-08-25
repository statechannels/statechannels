import {
  SignedState as SignedStateWire,
  Outcome as OutcomeWire,
  Objective as ObjectiveWire,
  Allocation as AllocationWire,
  SingleAssetOutcome as SingleAssetOutcomeWire,
  Message as WireMessage,
  validateMessage
} from '@statechannels/wire-format';
import {State as NitroState, hashState} from '@statechannels/nitro-protocol';

import {
  SignedState,
  Outcome,
  SingleAssetOutcome,
  Allocation,
  Participant,
  makeAddress,
  Payload,
  SharedObjective
} from '../../types';
import {BN} from '../../bignumber';
import {makeDestination} from '../../utils';
import {convertToNitroOutcome, getSignerAddress} from '../../state-utils';

export function convertToInternalParticipant(participant: {
  destination: string;
  signingAddress: string;
  participantId: string;
}): Participant {
  return {
    ...participant,
    signingAddress: makeAddress(participant.signingAddress),
    destination: makeDestination(participant.destination)
  };
}

type WirePayload = WireMessage['data'];

export function validatePayload(rawPayload: unknown): WirePayload {
  // TODO: wire-format should export a validator specially for the payload
  return validateMessage({recipient: '', sender: '', data: rawPayload}).data;
}

export function deserializeMessage(message: WireMessage): Payload {
  const signedStates = message?.data?.signedStates?.map(ss => deserializeState(ss));
  const objectives = message?.data?.objectives?.map(objective => deserializeObjective(objective));
  const requests = message?.data?.requests;
  const walletVersion = message.data.walletVersion;

  return {
    walletVersion,
    signedStates,
    objectives,
    requests
  };
}

export function wireStateToNitroState(state: SignedStateWire): NitroState {
  return {
    turnNum: state.turnNum,
    isFinal: state.isFinal,
    channel: {
      channelNonce: state.channelNonce,
      participants: state.participants.map(s => s.signingAddress),
      chainId: state.chainId
    },
    challengeDuration: state.challengeDuration,
    outcome: convertToNitroOutcome(deserializeOutcome(state.outcome)),
    appDefinition: state.appDefinition,
    appData: state.appData
  };
}
export function hashWireState(state: SignedStateWire): string {
  return hashState(wireStateToNitroState(state));
}

export function deserializeState(state: SignedStateWire): SignedState {
  const deserializedState = {
    ...state,
    channelId: undefined,
    appDefinition: makeAddress(state.appDefinition),
    outcome: deserializeOutcome(state.outcome),
    participants: state.participants.map(convertToInternalParticipant)
  };

  return {
    ...deserializedState,
    signatures: state.signatures.map(sig => ({
      signature: sig,
      signer: getSignerAddress(deserializedState, sig)
    }))
  };
}

export function deserializeObjective(objective: ObjectiveWire): SharedObjective {
  const participants = objective.participants.map(p => ({
    ...p,
    signingAddress: makeAddress(p.signingAddress),
    destination: makeDestination(p.destination)
  }));

  return {...objective, participants};
}

export function deserializeOutcome(outcome: OutcomeWire): Outcome {
  return outcome.map(deserializeSingleAssetOutcome);
}

function deserializeSingleAssetOutcome(
  singleAssetOutcome: SingleAssetOutcomeWire
): SingleAssetOutcome {
  return {
    asset: makeAddress(singleAssetOutcome.asset),
    allocations: singleAssetOutcome.allocations.map(deserializeAllocation),
    metadata: singleAssetOutcome.metadata
  };
}

function deserializeAllocation(allocation: AllocationWire): Allocation {
  const {amount, destination, metadata, allocationType} = allocation;
  return {
    amount: BN.from(amount),
    destination: makeDestination(destination),
    metadata,
    allocationType
  };
}
