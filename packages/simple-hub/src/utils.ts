import {Participant} from './wallet/xstate-wallet-internals';
import {cHubChannelSigningAddress, cHubParticipantId} from './constants';

export function containsHubSigningAddress(participant: Participant): boolean {
  return participant.signingAddress === cHubChannelSigningAddress;
}

export function notContainsHubParticipantId(participant: Participant): boolean {
  return participant.participantId !== cHubParticipantId;
}
