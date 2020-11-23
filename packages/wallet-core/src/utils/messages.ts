import { makeAddress, Participant } from '../types';

import { makeDestination } from '.';

export function convertToParticipant(participant: {
  destination: string;
  signingAddress: string;
  participantId: string;
}): Participant {
  return {
    ...participant,
    signingAddress: makeAddress(participant.signingAddress),
    destination: makeDestination(participant.destination),
  };
}
