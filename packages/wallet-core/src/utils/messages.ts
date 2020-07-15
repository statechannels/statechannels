import {Participant} from '../types';
import {makeDestination} from '.';

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
