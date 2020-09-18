import {makeDestination} from '@statechannels/nitro-protocol';

import {Participant} from '../types';

export function convertToParticipant(participant: {
  destination: string;
  signingAddress: string;
  participantId: string;
}): Participant {
  return {
    ...participant,
    destination: makeDestination(participant.destination)
  };
}
