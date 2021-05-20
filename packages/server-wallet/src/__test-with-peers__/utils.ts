import {ChannelResult, CreateChannelParams} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Engine, Wallet} from '..';
import {PeerSetup} from '../../jest/with-peers-setup-teardown';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';
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

export function waitForObjectiveProposals(objectiveIds: string[], wallet: Wallet): Promise<void> {
  const handledObjectiveIds = new Set<string>();
  return new Promise<void>(resolve => {
    const listener = (o: WalletObjective) => {
      if (objectiveIds.includes(o.objectiveId)) {
        handledObjectiveIds.add(o.objectiveId);

        if (handledObjectiveIds.size === _.uniq(objectiveIds).length) {
          resolve();
        }
      }
    };
    wallet.on('ObjectiveProposed', listener);
  });
}
