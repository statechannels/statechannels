import {accumulateSideEffects} from "../outbox";
import {SharedData, queueRelayableActionMessage, getExistingChannel, checkAndStore} from "../state";
import * as selectors from "../selectors";
import {TwoPartyPlayerIndex, ThreePartyPlayerIndex} from "../types";
import {getLastState, nextParticipant} from "../channel-store";

import {ProtocolLocator} from "../../communication";
import * as comms from "../../communication";
import {ourTurn as ourTurnOnChannel} from "../channel-store";
import _ from "lodash";
import {bigNumberify} from "ethers/utils";

import {SignedState} from "@statechannels/nitro-protocol";
import {getAllocationOutcome} from "../../utils/outcome-utils";
import {apiNotImplemented, channelUpdatedEvent} from "../sagas/messaging/outgoing-api-actions";

export function showWallet(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: "Show"
  });
  return newSharedData;
}

export function hideWallet(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    displayOutbox: "Hide"
  });
  return newSharedData;
}

export function sendConcludeSuccess(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: apiNotImplemented({apiMethod: "ConcludeSuccess"})
    // TODO could rename this helper function, as it covers both ways of finalizing a channel
  });
  return newSharedData;
}

export function sendConcludeInstigated(sharedData: SharedData, channelId: string): SharedData {
  const channelState = selectors.getChannelState(sharedData, channelId);
  const fromParticipantId = channelState.participants[channelState.ourIndex].participantId;
  // Assume a 2 participant channel
  const toParticipantId = channelState.participants[1 - channelState.ourIndex].participantId;
  if (!fromParticipantId || !toParticipantId) {
    throw new Error("No participant id found");
  }
  const messageRelay = comms.concludeInstigated({channelId});
  return queueRelayableActionMessage(sharedData, messageRelay, toParticipantId, fromParticipantId);
}

export function sendOpponentConcluded(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: apiNotImplemented({apiMethod: "OpponentConcluded"})
    // TODO could rename this helper function, as it covers both ways of finalizing a channel
  });
  return newSharedData;
}
export function sendChannelUpdatedEvent(sharedData: SharedData, channelId: string): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: channelUpdatedEvent({channelId})
    // TODO could rename this helper function, as it covers both ways of finalizing a channel
  });
  return newSharedData;
}
export function sendStates(
  sharedData: SharedData,
  processId: string,
  channelId: string,
  protocolLocator: ProtocolLocator
): SharedData {
  const channel = getExistingChannel(sharedData, channelId);
  const {participants, ourIndex} = channel;
  // TODO: It's possible the current channel participants do not have the participant id defined
  const toParticipantId = selectors.getParticipantIdForAddress(
    sharedData,
    nextParticipant(participants, ourIndex).signingAddress
  );
  const fromParticipantId = selectors.getParticipantIdForAddress(
    sharedData,
    channel.participants[ourIndex].signingAddress
  );
  if (!fromParticipantId || !toParticipantId) {
    throw new Error("Could not send states, could not find participant ids");
  }
  const messageRelay = comms.signedStatesReceived({
    processId,
    signedStates: channel.signedStates,
    protocolLocator
  });
  return queueRelayableActionMessage(sharedData, messageRelay, toParticipantId, fromParticipantId);
}

export function checkStates(
  sharedData: SharedData,
  turnNum: number,
  states: SignedState[]
): SharedData {
  // We don't bother checking "stale" states -- those whose turnNum does not
  // exceed the current turnNum.

  states
    .filter(ss => ss.state.turnNum > turnNum)
    .map(ss => {
      const result = checkAndStore(sharedData, ss);
      if (result.isSuccess) {
        sharedData = result.store;
      } else {
        throw new Error("Unable to validate state");
      }
    });

  return sharedData;
}

export function sendChallengeResponseRequested(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: apiNotImplemented({apiMethod: "ChallengeResponseRequested"})
  });
  return newSharedData;
}

export function sendChallengeStateReceived(sharedData: SharedData) {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: apiNotImplemented({apiMethod: "ChallengeStateReceived"})
  });
  return newSharedData;
}

// TODO 'Complete' here means the challenge was successfully responded to
export function sendChallengeComplete(sharedData: SharedData, channelId: string) {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: channelUpdatedEvent({channelId})
  });
  return newSharedData;
}

export function sendConcludeFailure(sharedData: SharedData): SharedData {
  const newSharedData = {...sharedData};
  newSharedData.outboxState = accumulateSideEffects(newSharedData.outboxState, {
    messageOutbox: apiNotImplemented({apiMethod: "ConcludeFailure"})
  });
  return newSharedData;
}

export const channelIsClosed = (channelId: string, sharedData: SharedData): boolean => {
  return (
    channelHasConclusionProof(channelId, sharedData) ||
    channelFinalizedOnChain(channelId, sharedData)
  );
};

export const channelFundsAnotherChannel = (channelId: string, sharedData: SharedData): boolean => {
  const latestState = getLatestState(channelId, sharedData);
  const {allocation} = getAllocationOutcome(latestState.outcome);
  return (
    _.intersection(
      selectors.getChannelIds(sharedData),
      allocation.map(a => a.destination)
    ).length > 0
  );
};

export const channelHasConclusionProof = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getOpenedChannelState(sharedData, channelId);
  const [penultimateState, lastState] = channelState.signedStates.map(ss => ss.state);
  return penultimateState.isFinal && lastState.isFinal;
};

export const channelFinalizedOnChain = (channelId: string, sharedData: SharedData): boolean => {
  const channelState = selectors.getAdjudicatorChannelState(sharedData, channelId);
  return channelState && channelState.finalized;
};

export enum FundingType {
  Virtual,
  Ledger,
  Direct
}
export const getChannelFundingType = (channelId: string, sharedData: SharedData): FundingType => {
  const channelFundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!channelFundingState) {
    throw new Error(`No funding state for ${channelId}. Cannot determine funding type.`);
  }
  if (channelFundingState.directlyFunded) {
    return FundingType.Direct;
  }
  if (!channelFundingState.fundingChannel) {
    throw new Error(`Channel ${channelId} is not directly funded but has not fundingChannelId`);
  }
  const channelState = getExistingChannel(sharedData, channelFundingState.fundingChannel);
  return channelState.participants.length === 3 ? FundingType.Virtual : FundingType.Ledger;
};

export const getTwoPlayerIndex = (
  channelId: string,
  sharedData: SharedData
): TwoPartyPlayerIndex => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.participants.map(p => p.signingAddress).indexOf(channelState.address);
};
export const isFirstPlayer = (channelId: string, sharedData: SharedData) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.ourIndex === TwoPartyPlayerIndex.A;
};

export const isLastPlayer = (channelId: string, sharedData: SharedData) => {
  const channelState = selectors.getChannelState(sharedData, channelId);
  return channelState.ourIndex === channelState.participants.length - 1;
};

export function isSafeToSend({
  sharedData,
  channelId,
  ourIndex,
  clearedToSend
}: {
  sharedData: SharedData;
  ourIndex: TwoPartyPlayerIndex | ThreePartyPlayerIndex;
  channelId?: string;
  clearedToSend: boolean;
}): boolean {
  if (!clearedToSend) {
    return false;
  }

  // The possibilities are:
  // A. The channel is not in storage and our index is 0.
  // B. The channel is not in storage and our index is not 0.
  // C. The channel is in storage and it's our turn
  // D. The channel is in storage and it's not our turn

  if (!channelId) {
    return ourIndex === 0;
  }

  const channel = selectors.getChannelState(sharedData, channelId);
  const numParticipants = channel.participants.length;
  return (channel.turnNum + 1) % numParticipants === ourIndex;
}

export function getOpponentAddress(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);

  const {participants} = channel;
  const opponentAddress = participants[(channel.ourIndex + 1) % participants.length];
  return opponentAddress.signingAddress;
}

export function getOurAddress(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);
  return channel.participants[channel.ourIndex].signingAddress;
}

export function getLatestState(channelId: string, sharedData: SharedData) {
  const channel = getExistingChannel(sharedData, channelId);
  return getLastState(channel);
}

export function ourTurn(sharedData: SharedData, channelId: string) {
  const channel = getExistingChannel(sharedData, channelId);
  return ourTurnOnChannel(channel);
}

export function getFundingChannelId(channelId: string, sharedData: SharedData): string {
  const fundingState = selectors.getChannelFundingState(sharedData, channelId);
  if (!fundingState) {
    throw new Error(`No funding state found for ${channelId}`);
  }
  if (fundingState.directlyFunded) {
    return channelId;
  } else {
    const channelIdToCheck = !!fundingState.fundingChannel
      ? fundingState.fundingChannel
      : fundingState.guarantorChannel;
    if (!channelIdToCheck) {
      throw new Error(
        `Funding state for ${channelId} is not directly funded so it must have aq funding or guarantor channel`
      );
    }

    return getFundingChannelId(channelIdToCheck, sharedData);
  }
}

export function removeZeroFundsFromBalance(
  incomingAllocation: string[],
  incomingDestination: string[]
): {allocation: string[]; destination: string[]} {
  const allocation: string[] = [];
  const destination: string[] = [];
  incomingAllocation.map((a, i) => {
    if (bigNumberify(a).gt(0)) {
      allocation.push(incomingAllocation[i]);
      destination.push(incomingDestination[i]);
    }
  });
  return {allocation, destination};
}
