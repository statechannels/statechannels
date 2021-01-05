import {ChannelResult} from '@statechannels/client-api-schema';
import {ChannelRequest, Payload, SignedState} from '@statechannels/wire-format';

import {Wallet} from '../wallet';
import {Outgoing} from '..';

export const ONE_DAY = 86400;

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

export async function interParticipantChannelResultsAreEqual(a: Wallet, b: Wallet): Promise<void> {
  const {channelResults: aChannelResults} = await a.getChannels();
  const {channelResults: bChannelResults, outbox: bOutbox} = await b.getChannels();

  const nullifyFunding = (cr: ChannelResult) => ({...cr, fundingStatus: null});

  expect(aChannelResults.map(nullifyFunding)).toEqual(bChannelResults.map(nullifyFunding));
  expect(bOutbox).toEqual([]);
}

export function getRequestFor(channelId: string, outbox: Outgoing[]): ChannelRequest {
  // eslint-disable-next-line
  const requests = (outbox[0]!.params.data as Payload).requests!.filter(
    req => req.channelId === channelId
  );
  if (requests.length != 1) throw Error(`Expected exactly one request found ${requests.length}`);
  return requests[0];
}
