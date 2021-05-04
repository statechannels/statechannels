import {ChannelResult, CreateChannelParams} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Engine} from '..';
import {PeerSetup, TestPeerWallets} from '../../jest/with-peers-setup-teardown';
import {EngineEvent} from '../engine';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';
import {isTestMessageService, LatencyOptions} from '../message-service/test-message-service';
import {WalletObjective} from '../models/objective';

export async function expectLatestStateToMatch(
  channelId: string,
  engine: Engine,
  partial: Partial<ChannelResult>
): Promise<void> {
  const latest = await engine.getState({channelId});
  expect(latest.channelResult).toMatchObject(partial);
}

export function getWithPeersCreateChannelsArgs(peerSetup: PeerSetup): CreateChannelParams {
  return createChannelArgs({
    participants: [peerSetup.participantA, peerSetup.participantB],
    fundingStrategy: 'Fake',
  });
}

export function waitForObjectiveEvent(
  objectiveIds: string[],
  objectiveEventType: EngineEvent['type'],
  engine: Engine
): Promise<void> {
  const handledObjectiveIds = new Set<string>();
  return new Promise<void>(resolve => {
    const listener = (o: WalletObjective) => {
      if (objectiveIds.includes(o.objectiveId)) {
        handledObjectiveIds.add(o.objectiveId);

        if (handledObjectiveIds.size === _.uniq(objectiveIds).length) {
          engine.removeListener(objectiveEventType);
          resolve();
        }
      }
    };
    engine.on(objectiveEventType, listener);
  });
}

export function setLatencyOptions(
  peerWallets: TestPeerWallets,
  options: Partial<LatencyOptions>
): void {
  const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

  for (const messageService of messageServices) {
    if (!isTestMessageService(messageService)) {
      throw new Error('Can only set latency options on a TestMessageService');
    } else {
      messageService.setLatencyOptions(options);
    }
  }
}

export function unfreeze(peerWallets: TestPeerWallets): void {
  const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

  for (const messageService of messageServices) {
    if (!isTestMessageService(messageService)) {
      throw new Error('Can only set latency options on a TestMessageService');
    } else {
      messageService.unfreeze();
    }
  }
}

export function freeze(peerWallets: TestPeerWallets): void {
  const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

  for (const messageService of messageServices) {
    if (!isTestMessageService(messageService)) {
      throw new Error('Can only set latency options on a TestMessageService');
    } else {
      messageService.freeze();
    }
  }
}
