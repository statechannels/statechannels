import {CreateChannelParams} from '@statechannels/client-api-schema';
import Knex from 'knex';

import {setupPeerEngines, teardownPeerSetup, PeerSetup} from '../../jest/with-peers-setup-teardown';
import {WalletObjective, ObjectiveModel} from '../models/objective';
import {createChannelArgs} from '../engine/__test__/fixtures/create-channel';
import {bob} from '../engine/__test__/fixtures/participants';
import {getChannelResultFor, getPayloadFor} from '../__test__/test-helpers';

jest.setTimeout(10_000);
let peerSetup: PeerSetup;
beforeAll(async () => {
  peerSetup = await setupPeerEngines(true);
});
afterAll(async () => {
  await teardownPeerSetup(peerSetup);
});
test('Objectives can be synced if a message is lost', async () => {
  const createChannelParams: CreateChannelParams = createChannelArgs();

  const {peerEngines} = peerSetup;
  // We mimic not receiving a message containing objectives
  const messageToLose = await peerEngines.a.createChannel(createChannelParams);

  const channelId = messageToLose.channelResult.channelId;
  const objectiveId = `OpenChannel-${channelId}`;

  // Only A should have the objective since we "lost" the message
  expect(await getObjective(peerEngines.a.knex, objectiveId)).toBeDefined();
  expect(await getObjective(peerEngines.b.knex, objectiveId)).toBeUndefined();

  // We would then call sync after some time of waiting and not making progress
  const outbox = await peerEngines.a.syncObjectives([objectiveId]);

  // After sync funding should continue as normal
  const {channelResults} = await peerEngines.b.pushMessage(
    getPayloadFor(bob().participantId, outbox)
  );
  expect(getChannelResultFor(channelId, channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });
});

test('handles the objective being synced even if no message is lost', async () => {
  const createChannelParams: CreateChannelParams = createChannelArgs();
  const {peerEngines} = peerSetup;
  const messageResponse = await peerEngines.a.createChannel(createChannelParams);

  const channelId = messageResponse.channelResult.channelId;
  const objectiveId = `OpenChannel-${channelId}`;

  // The initial message is received
  await peerEngines.b.pushMessage(
    getPayloadFor(
      bob().participantId,
      messageResponse.outbox.map(o => o.params)
    )
  );

  // We expect both objectives to be there
  expect(await getObjective(peerEngines.a.knex, objectiveId)).toBeDefined();
  expect(await getObjective(peerEngines.b.knex, objectiveId)).toBeDefined();

  const syncOutbox = await peerEngines.a.syncObjectives([objectiveId]);

  // Now we push in the sync payload
  const {outbox, channelResults} = await peerEngines.b.pushMessage(
    getPayloadFor(bob().participantId, syncOutbox)
  );

  // The only expected result is a sync channel response
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({
    method: 'MessageQueued',
    params: {
      recipient: 'alice',
      sender: 'bob',
      data: {signedStates: [expect.objectContaining({turnNum: 0})]},
    },
  });

  // TODO: https://github.com/statechannels/statechannels/issues/3289
  //expect(newObjectives).toHaveLength(0);

  expect(channelResults).toHaveLength(1);
});

test('Can successfully push the sync objective message multiple times', async () => {
  const createChannelParams: CreateChannelParams = createChannelArgs();
  const {peerEngines} = peerSetup;
  // We mimic not receiving a message containing objectives
  const messageToLose = await peerEngines.a.createChannel(createChannelParams);

  const channelId = messageToLose.channelResult.channelId;
  const objectiveId = `OpenChannel-${channelId}`;

  // Only A should have the objective since we "lost" the message
  expect(await getObjective(peerEngines.a.knex, objectiveId)).toBeDefined();
  expect(await getObjective(peerEngines.b.knex, objectiveId)).toBeUndefined();

  // We would then call sync after some time of waiting and not making progress
  const syncResult = await peerEngines.a.syncObjectives([objectiveId]);

  // We push the message to B
  await peerEngines.b.pushMessage(getPayloadFor(bob().participantId, syncResult));

  // We push the message to B again and check the results
  const {outbox, channelResults} = await peerEngines.b.pushMessage(
    getPayloadFor(bob().participantId, syncResult)
  );

  // The only expected result is a sync channel response
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({
    method: 'MessageQueued',
    params: {
      recipient: 'alice',
      sender: 'bob',
      data: {signedStates: [expect.objectContaining({turnNum: 0})]},
    },
  });

  expect(channelResults).toHaveLength(1);
  expect(channelResults[0]).toMatchObject({channelId});

  // TODO: https://github.com/statechannels/statechannels/issues/3289
  //expect(newObjectives).toHaveLength(0);
});

async function getObjective(knex: Knex, objectiveId: string): Promise<WalletObjective | undefined> {
  const model = await ObjectiveModel.query(knex).findById(objectiveId);
  return model?.toObjective();
}
