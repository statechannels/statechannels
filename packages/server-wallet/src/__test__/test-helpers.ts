import { ChannelResult } from '@statechannels/client-api-schema';
import { Payload, SignedState } from '@statechannels/wire-format';
import { AllocationItem, areAllocationItemsEqual } from '@statechannels/wallet-core';

import { Wallet } from '../wallet';
import { Outgoing } from '..';

export function getPayloadFor(participantId: string, outbox: Outgoing[]): unknown {
  const filteredOutbox = outbox.filter(outboxItem => outboxItem.params.recipient === participantId);
  if (filteredOutbox.length != 1)
    throw Error(`Expected exactly one message in outbox: found ${filteredOutbox.length}`);
  return filteredOutbox[0].params.data;
}

export function getChannelResultFor(
  channelId: string,
  channelResults: ChannelResult[]
): ChannelResult {
  const filteredChannelResults = channelResults.filter(
    channelResult => channelResult.channelId === channelId
  );
  if (filteredChannelResults.length != 1)
    throw Error(`Expected exactly one channel result: found ${filteredChannelResults.length}`);
  return filteredChannelResults[0];
}

export function getSignedStateFor(channelId: string, outbox: Outgoing[]): SignedState {
  // eslint-disable-next-line
  const filteredSignedStates = (outbox[0]!.params.data as Payload).signedStates!.filter(
    ss => ss.channelId === channelId
  );
  if (filteredSignedStates.length != 1)
    throw Error(`Expected exactly one channel result: found ${filteredSignedStates.length}`);
  return filteredSignedStates[0];
}

export async function crashAndRestart(wallet: Wallet): Promise<Wallet> {
  const config = wallet.walletConfig;
  await wallet.destroy();
  return Wallet.create(config); // Wallet that will "restart"
}

expect.extend({
  toContainAllocationItem(received: AllocationItem[], argument: AllocationItem) {
    const pass = received.some(areAllocationItemsEqual.bind(null, argument));
    if (pass) {
      return {
        pass: true,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to not contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    } else {
      return {
        pass: false,
        message: () =>
          `expected ${JSON.stringify(received, null, 2)} to contain ${JSON.stringify(
            argument,
            null,
            2
          )}`,
      };
    }
  },
});
