import {
  calculateChannelId,
  simpleEthAllocation,
  serializeState,
  SignedState,
} from '@statechannels/wallet-core';
import {ChannelResult} from '@statechannels/client-api-schema';
import _ from 'lodash';

import {Channel} from '../../../models/channel';
import {addHash} from '../../../state-utils';
import {alice, bob, charlie} from '../fixtures/signing-wallets';
import {alice as aliceP, bob as bobP, charlie as charlieP} from '../fixtures/participants';
import {seedAlicesSigningWallet} from '../../../db/seeds/1_signing_wallet_seeds';
import {stateSignedBy} from '../fixtures/states';
import {channel, withSupportedState} from '../../../models/__test__/fixtures/channel';
import {stateVars} from '../fixtures/state-vars';
import {ObjectiveModel} from '../../../models/objective';
import {defaultTestConfig} from '../../../config';
import {DBAdmin} from '../../../db-admin/db-admin';
import {WALLET_VERSION} from '../../../version';
import {PushMessageError} from '../../../errors/engine-error';
import {MultiThreadedEngine, Engine} from '../..';

const dropNonVariables = (s: SignedState): any =>
  _.pick(s, 'appData', 'outcome', 'isFinal', 'turnNum', 'stateHash', 'signatures');

jest.setTimeout(20_000);

let engine: Engine;
let multiThreadedEngine: MultiThreadedEngine;

beforeAll(async () => {
  await DBAdmin.migrateDatabase(defaultTestConfig());
  engine = await Engine.create(defaultTestConfig());

  multiThreadedEngine = await MultiThreadedEngine.create(
    defaultTestConfig({workerThreadAmount: 2})
  );
});

afterAll(async () => {
  await engine.destroy();
  await multiThreadedEngine.destroy();
});
beforeEach(async () => seedAlicesSigningWallet(engine.knex));

it("doesn't throw on an empty message", () => {
  return expect(engine.pushMessage({walletVersion: WALLET_VERSION})).resolves.not.toThrow();
});

const zero = 0;
const four = 4;
const five = 5;
const six = 6;

it('stores states contained in the message, in a single channel model', async () => {
  const channelsBefore = await Channel.query(engine.knex).select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy([alice()])({turnNum: five}),
    stateSignedBy([alice(), bob()])({turnNum: four}),
  ];
  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: signedStates.map(s => serializeState(s)),
  });

  const channelsAfter = await Channel.query(engine.knex).select();

  expect(channelsAfter).toHaveLength(1);
  expect(channelsAfter[0].vars).toHaveLength(2);

  // The Channel model adds the state hash before persisting
  expect(channelsAfter[0].vars).toMatchObject(signedStates.map(s => dropNonVariables(s)));
});

it('ignores duplicate states', async () => {
  const channelsBefore = await Channel.query(engine.knex).select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [
    stateSignedBy([alice()])({turnNum: five}),
    stateSignedBy([alice(), bob()])({turnNum: four}),
  ];
  // First call should add the states
  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: signedStates.map(s => serializeState(s)),
  });
  // Second call should be ignored
  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: signedStates.map(s => serializeState(s)),
  });
  const channelsAfter = await Channel.query(engine.knex).select();

  expect(channelsAfter).toHaveLength(1);
  expect(channelsAfter[0].vars).toHaveLength(2);

  // The Channel model adds the state hash before persisting
  expect(channelsAfter[0].vars).toMatchObject(signedStates.map(s => dropNonVariables(s)));
});

it('throws for channels with different chain id', async () => {
  let signedState = serializeState(stateSignedBy([alice()])({turnNum: five}));
  signedState = {...signedState, chainId: engine.store.chainNetworkID + 'deadbeef'};

  await expect(
    engine.pushMessage({
      walletVersion: WALLET_VERSION,
      signedStates: [signedState],
    })
  ).rejects.toThrow();
});

it('adds signatures to existing states', async () => {
  const channelsBefore = await Channel.query(engine.knex).select();
  expect(channelsBefore).toHaveLength(0);
  const signedByAlice = stateSignedBy([alice()])({turnNum: five});
  const signedByBob = stateSignedBy([bob()])({turnNum: five});

  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: [serializeState(signedByAlice)],
  });

  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: [serializeState(signedByBob)],
  });
  const channelsAfter = await Channel.query(engine.knex).select();

  expect(channelsAfter).toHaveLength(1);
  expect(channelsAfter[0].vars).toHaveLength(1);
  const signatures = channelsAfter[0].supported?.signatures.map(s => s.signer);
  expect(signatures).toContain(alice().address);
  expect(signatures).toContain(bob().address);
});

const expectResults = async (
  p: Promise<{channelResults: ChannelResult[]}>,
  channelResults: Partial<ChannelResult>[]
): Promise<void> => {
  await expect(p.then(data => data.channelResults)).resolves.toHaveLength(channelResults.length);
  await expect(p).resolves.toMatchObject({channelResults});
};

describe('channel results', () => {
  it("returns a 'proposed' channel result when receiving the first state from a peer", async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [serializeState(stateSignedBy([bob()])({turnNum: zero}))];

    await expectResults(engine.pushMessage({walletVersion: WALLET_VERSION, signedStates}), [
      {turnNum: zero, status: 'proposed'},
    ]);
  });

  it("returns a 'running' channel result when receiving a state in a channel that is now running", async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);
    const {channelId} = await Channel.query(engine.knex).insert(
      withSupportedState()({vars: [stateVars({turnNum: 8})]})
    );

    return expectResults(
      engine.pushMessage({
        walletVersion: WALLET_VERSION,
        signedStates: [serializeState(stateSignedBy([bob()])({turnNum: 9}))],
      }),
      [{channelId, turnNum: 9, status: 'running'}]
    );
  });

  it("returns a 'closing' channel result when receiving a state in a channel that is now closing", async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const participants = [aliceP(), bobP(), charlieP()];
    const vars = [stateVars({turnNum: 9})];
    const channel = withSupportedState([alice(), bob(), charlie()])({vars, participants});
    const {channelId} = await Channel.query(engine.knex).insert(channel);

    const signedStates = [stateSignedBy([bob()])({turnNum: 10, isFinal: true, participants})];
    return expectResults(
      engine.pushMessage({
        walletVersion: WALLET_VERSION,
        signedStates: signedStates.map(ss => serializeState(ss)),
      }),
      [{channelId, turnNum: 10, status: 'closing'}]
    );
  });

  it("returns a 'closed' channel result when receiving a state in a channel that is now closed", async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      serializeState(stateSignedBy([alice(), bob()])({turnNum: 9, isFinal: true})),
    ];
    const result = engine.pushMessage({walletVersion: WALLET_VERSION, signedStates});

    return expectResults(result, [{turnNum: 9, status: 'closed'}]);
  });

  it('stores states for multiple channels', async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      stateSignedBy([alice(), bob()])({turnNum: five}),
      stateSignedBy([alice(), bob()])({turnNum: six, channelNonce: 567, appData: '0x0f00'}),
    ];

    const p = engine.pushMessage({
      walletVersion: WALLET_VERSION,
      signedStates: signedStates.map(s => serializeState(s)),
    });

    await expectResults(p, [{turnNum: five}, {turnNum: six, appData: '0x0f00'}]);

    const channelsAfter = await Channel.query(engine.knex).select();

    expect(channelsAfter).toHaveLength(2);
    expect(channelsAfter[0].vars).toHaveLength(1);

    // The Channel model adds the state hash before persisting

    const stateVar = signedStates[1];
    const record = await Channel.forId(calculateChannelId(stateVar), engine.knex);

    expect(record.vars[0]).toMatchObject(dropNonVariables(stateVar));
  });
});

it("Doesn't store stale states", async () => {
  const channelsBefore = await Channel.query(engine.knex).select();
  expect(channelsBefore).toHaveLength(0);

  const signedStates = [serializeState(stateSignedBy([alice(), bob()])({turnNum: five}))];
  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates,
  });

  const afterFirst = await Channel.query(engine.knex).select();

  expect(afterFirst).toHaveLength(1);
  expect(afterFirst[0].vars).toHaveLength(1);
  expect(afterFirst[0].supported).toBeTruthy();
  expect(afterFirst[0].supported?.turnNum).toEqual(five);

  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: [serializeState(stateSignedBy()({turnNum: four}))],
  });
  const afterSecond = await Channel.query(engine.knex).select();
  expect(afterSecond[0].vars).toHaveLength(1);
  expect(afterSecond).toMatchObject(afterFirst);

  await engine.pushMessage({
    walletVersion: WALLET_VERSION,
    signedStates: [serializeState(stateSignedBy()({turnNum: six}))],
  });

  const afterThird = await Channel.query(engine.knex).select();
  expect(afterThird[0].vars).toHaveLength(2);
});

it("doesn't store states for unknown signing addresses", async () => {
  await DBAdmin.truncateDataBaseFromKnex(engine.knex, ['signing_wallets']);

  const signedStates = [serializeState(stateSignedBy([alice(), bob()])({turnNum: five}))];
  return expect(engine.pushMessage({walletVersion: WALLET_VERSION, signedStates})).rejects.toThrow(
    PushMessageError
  );
});

describe('when the application protocol returns an action', () => {
  it('signs the postfund setup when the prefund setup is supported', async () => {
    const state = stateSignedBy()({outcome: simpleEthAllocation([])});

    const c = channel({vars: [addHash(state)]});
    await Channel.query(engine.knex).insert(c);

    await ObjectiveModel.insert(
      {
        type: 'OpenChannel',
        participants: c.participants,
        data: {
          targetChannelId: c.channelId,
          fundingStrategy: 'Fake', // Could also be Direct, funding is empty
          role: 'app',
        },
      },
      true,
      engine.knex
    );

    expect(c.latestSignedByMe?.turnNum).toEqual(0);
    expect(c.supported).toBeUndefined();
    const {channelId} = c;

    const p = engine.pushMessage({
      walletVersion: WALLET_VERSION,
      signedStates: [serializeState(stateSignedBy([bob()])(state))],
    });
    await expectResults(p, [{channelId, status: 'opening'}]);
    await expect(p).resolves.toMatchObject({
      outbox: [{method: 'MessageQueued', params: {data: {signedStates: [{turnNum: 3}]}}}],
    });

    const updatedC = await Channel.forId(channelId, engine.knex);
    expect(updatedC.protocolState).toMatchObject({
      latestSignedByMe: {turnNum: 3},
      supported: {turnNum: 0},
    });
  });

  it.each(['with', 'without'] as const)(
    'emits objectiveStarted when a engine %s worker threads receives a new objective',
    async withOrWithout => {
      const _engine: Engine = withOrWithout === 'with' ? engine : multiThreadedEngine;
      const turnNum = 6;
      const state = stateSignedBy()({outcome: simpleEthAllocation([]), turnNum});

      const c = channel({vars: [addHash(state)]});
      await Channel.query(_engine.knex).insert(c);

      const {channelId} = c;
      const finalState = {...state, isFinal: true, turnNum: turnNum + 1};

      const callback = jest.fn();
      _engine.once('objectiveStarted', callback);

      const result = await _engine.pushMessage({
        walletVersion: WALLET_VERSION,
        signedStates: [serializeState(stateSignedBy([bob()])(finalState))],
        objectives: [
          {
            type: 'CloseChannel',
            participants: [],
            data: {
              targetChannelId: channelId,
              fundingStrategy: 'Direct',
              txSubmitterOrder: [1, 0],
            },
          },
        ],
      });
      expect(result.newObjectives).toHaveLength(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({type: 'CloseChannel'}));
    }
  );

  it('forms a conclusion proof when the peer wishes to close the channel', async () => {
    const turnNum = 6;
    const state = stateSignedBy()({outcome: simpleEthAllocation([]), turnNum});

    const c = channel({vars: [addHash(state)]});
    await Channel.query(engine.knex).insert(c);

    const {channelId} = c;
    const finalState = {...state, isFinal: true, turnNum: turnNum + 1};

    const p = engine.pushMessage({
      walletVersion: WALLET_VERSION,
      signedStates: [serializeState(stateSignedBy([bob()])(finalState))],
      objectives: [
        {
          type: 'CloseChannel',
          participants: [],
          data: {
            targetChannelId: channelId,
            fundingStrategy: 'Direct',
            txSubmitterOrder: [1, 0],
          },
        },
      ],
    });
    await expectResults(p, [{channelId, status: 'closed'}]);
    await expect(p).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates: [{turnNum: turnNum + 1, isFinal: true}]}},
        },
      ],
    });

    const updatedC = await Channel.forId(channelId, engine.knex);
    expect(updatedC.protocolState).toMatchObject({
      latestSignedByMe: {turnNum: turnNum + 1},
      supported: {turnNum: turnNum + 1},
    });
  });
});

describe('when there is a request provided', () => {
  it('has nothing in the outbox if there is no request added', async () => {
    await expect(
      engine.pushMessage({walletVersion: WALLET_VERSION, requests: []})
    ).resolves.toMatchObject({
      outbox: [],
    });
  });

  it('appends message with single state to the outbox satisfying a GetChannel request', async () => {
    // Set up test by adding a single state into the DB via pushMessage call
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);
    const signedStates = [serializeState(stateSignedBy([bob()])({turnNum: zero}))];
    await engine.pushMessage({walletVersion: WALLET_VERSION, signedStates});

    // Get the channelId of that which was added
    const [{channelId}] = await Channel.query(engine.knex).select();

    // Expect a GetChannel request to produce an outbound message with all states
    await expect(
      engine.pushMessage({
        walletVersion: WALLET_VERSION,
        requests: [{type: 'GetChannel', channelId}],
      })
    ).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates}},
        },
      ],
    });
  });

  it('appends message with multiple states to the outbox satisfying a GetChannel request', async () => {
    const channelsBefore = await Channel.query(engine.knex).select();
    expect(channelsBefore).toHaveLength(0);

    const signedStates = [
      stateSignedBy([alice()])({turnNum: five}),
      stateSignedBy([alice(), bob()])({turnNum: four}),
    ].map(s => serializeState(s));

    await engine.pushMessage({walletVersion: WALLET_VERSION, signedStates});

    // Get the channelId of that which was added
    const [{channelId}] = await Channel.query(engine.knex).select();

    // Expect a GetChannel request to produce an outbound message with all states
    await expect(
      engine.pushMessage({
        walletVersion: WALLET_VERSION,
        requests: [{type: 'GetChannel', channelId}],
      })
    ).resolves.toMatchObject({
      outbox: [
        {
          method: 'MessageQueued',
          params: {data: {signedStates: expect.arrayContaining(signedStates)}},
        },
      ],
    });
  });
});
