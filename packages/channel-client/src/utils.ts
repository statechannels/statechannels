import {hashMessage} from 'ethers/utils';

import {Participant} from './types';

/*
 This channel ID calculation revolves around `hashMessage` taking in a
 string but since the concat of the arguments are unique to each channel
 the channel ID should be different as a result.
*/
export function calculateChannelId(participants: Participant[], appDefinition: string): string {
  let message = '';
  participants.forEach(p => (message += p.participantId));
  message += appDefinition;
  return hashMessage(message);
}
