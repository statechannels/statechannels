import {hashMessage} from 'ethers/utils';

import {AllocationItem, Allocation, Participant} from './types';

export function calculateChannelId(
  participants: Participant[],
  allocations: Allocation[],
  appDefinition: string,
  appData: string
): string {
  let message = '';
  participants.forEach(p => (message += p.participantId));
  allocations.forEach((a: Allocation) => {
    message += a.token;
    a.allocationItems.forEach((aI: AllocationItem) => {
      message += aI.amount + aI.destination;
    });
  });

  message += appDefinition + appData;
  return hashMessage(message);
}
