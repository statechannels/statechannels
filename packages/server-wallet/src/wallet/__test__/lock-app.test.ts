import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';
import {StateVariables} from '@statechannels/wallet-core';

import {Channel, ChannelError} from '../../models/channel';
import {withSupportedState} from '../../models/__test__/fixtures/channel';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import adminKnex from '../../db-admin/db-admin-connection';
import {testKnex as knex} from '../../../jest/knex-setup-teardown';

import {stateVars} from './fixtures/state-vars';

jest.setTimeout(10_000);

it('works', async () => {
  await seedAlicesSigningWallet(knex);
  const c = withSupportedState()({vars: [stateVars({turnNum: 5})]});
  await Channel.query(knex).insert(c);

  const {channelId, latest} = c;
  await expect(
    Store.lockApp(knex, channelId, async tx =>
      Store.signState(channelId, {...latest, turnNum: latest.turnNum + 1}, false, tx)
    )
  ).resolves.toMatchObject({channelResult: {turnNum: 6}});
});
const next = ({turnNum, appData, isFinal, outcome}: StateVariables): StateVariables => ({
  turnNum: turnNum + 1,
  appData,
  isFinal,
  outcome,
});

describe('concurrency', () => {
  let channelId: string;
  let numResolved: number;
  let numRejected: number;
  let numSettled: number;

  let countResolvedPromise: any;
  let countRejectedPromise: any;
  let countSettledPromise: any;

  let c: Channel;

  beforeEach(async () => {
    await seedAlicesSigningWallet(knex);
    c = withSupportedState()({vars: [stateVars({turnNum: 5})]});
    await Channel.query(knex).insert(c);
    channelId = c.channelId;

    numResolved = 0;
    numRejected = 0;
    numSettled = 0;
    countResolvedPromise = ({channelResult}: {channelResult: ChannelResult}): any => {
      expect(channelResult).toMatchObject({turnNum: 6});
      numResolved += 1;
    };
    countRejectedPromise = (error: Error): any => {
      expect(error).toMatchObject(new Error('Stale state'));
      numRejected += 1;
    };
    countSettledPromise = (): any => (numSettled += 1);
  });

  it('works when run concurrently with the same channel', async () => {
    const numAttempts = 4;
    await Promise.all(
      _.range(numAttempts).map(() =>
        Store.lockApp(knex, channelId, async tx =>
          Store.signState(channelId, next(c.latest), false, tx)
        )
          .then(countResolvedPromise)
          .catch(countRejectedPromise)
          .finally(countSettledPromise)
      )
    );

    expect([numResolved, numRejected, numSettled]).toMatchObject([1, numAttempts - 1, numAttempts]);

    expect(numResolved).toEqual(1);
    expect(numRejected).toEqual(numAttempts - 1);
    expect(numSettled).toEqual(numAttempts);

    await expect(Store.getChannel(channelId, knex)).resolves.toMatchObject({
      latest: {turnNum: 6},
    });
  });

  // It takes ~650 to sign and store a state, on circle and in a jest test.
  // Thus, we give the test ample time to finish.
  const ONE_INSERT = 1200;
  const NUM_ATTEMPTS = 5;
  const OVERHEAD = 5_000;
  const MANY_INSERTS_TIMEOUT = NUM_ATTEMPTS * ONE_INSERT + OVERHEAD;
  it(
    `works when run concurrently with ${NUM_ATTEMPTS} different channels`,
    async () => {
      await adminKnex.raw('TRUNCATE TABLE channels RESTART IDENTITY CASCADE');

      const channelIds = await Promise.all(
        _.range(NUM_ATTEMPTS).map(async channelNonce => {
          const c = withSupportedState()({vars: [stateVars({turnNum: 5})], channelNonce});
          await Channel.query(knex).insert(c);
          return c.channelId;
        })
      );

      const t1 = Date.now();
      await Promise.all(
        channelIds.map(channelId =>
          Store.lockApp(knex, channelId, async (tx, c) =>
            Store.signState(channelId, next(c.latest), false, tx)
          )
            .then(countResolvedPromise)
            .finally(countSettledPromise)
        )
      );
      const t2 = Date.now();

      expect((t2 - t1) / NUM_ATTEMPTS).toBeLessThan(ONE_INSERT);

      expect([numResolved, numRejected, numSettled]).toMatchObject([NUM_ATTEMPTS, 0, NUM_ATTEMPTS]);

      await expect(Store.getChannel(channelIds[1], knex)).resolves.toMatchObject({
        latest: {turnNum: 6},
      });
    },
    MANY_INSERTS_TIMEOUT
  );

  test('sign state does not block concurrent updates', async () => {
    await Promise.all(
      _.range(NUM_ATTEMPTS).map(() =>
        Store.signState(channelId, next(c.latest), false, knex as any)
          .then(countResolvedPromise)
          .catch(countRejectedPromise)
          .finally(countSettledPromise)
      )
    );

    expect(numResolved).toEqual(NUM_ATTEMPTS);
    expect(numRejected).toEqual(0);
    expect(numSettled).toEqual(NUM_ATTEMPTS);

    await expect(Store.getChannel(channelId, knex)).resolves.toMatchObject({
      latest: next(c.latest),
    });
  });
});

describe('Missing channels', () => {
  it('throws a ChannelError by default', () =>
    expect(Store.lockApp(knex, 'foo', _.noop)).rejects.toThrow(
      new ChannelError(ChannelError.reasons.channelMissing, {channelId: 'foo'})
    ));

  it('calls the onChannelMissing handler when given', () =>
    expect(Store.lockApp(knex, 'foo', _.noop, _.noop)).resolves.not.toThrow());

  it('calls the onChannelMissing handler with the channel Id when given', () =>
    expect(Store.lockApp(knex, 'foo', _.noop, _.identity)).resolves.toEqual('foo'));
});
