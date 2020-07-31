import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';
import {StateVariables} from '@statechannels/wallet-core';

import {Channel, ChannelError} from '../../models/channel';
import {withSupportedState} from '../../models/__test__/fixtures/channel';
import {Store} from '../store';
import {seedAlicesSigningWallet} from '../../db/seeds/1_signing_wallet_seeds';
import knex from '../../db/connection';

import {stateVars} from './fixtures/state-vars';

it('works', async () => {
  await seedAlicesSigningWallet(knex);
  const c = withSupportedState(stateVars({turnNum: 5}))();
  await Channel.query().insert(c);

  const {channelId, latest} = c;
  await expect(
    Store.lockApp(channelId, async tx =>
      Store.signState(channelId, {...latest, turnNum: latest.turnNum + 1}, tx)
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
  let numAttempts: number;

  let c: Channel;

  beforeEach(async () => {
    await seedAlicesSigningWallet(knex);
    c = withSupportedState(stateVars({turnNum: 5}))();
    await Channel.query().insert(c);
    channelId = c.channelId;

    numAttempts = 10;
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
    await Promise.all(
      _.range(numAttempts).map(() =>
        Store.lockApp(channelId, async tx => Store.signState(channelId, next(c.latest), tx))
          .then(countResolvedPromise)
          .catch(countRejectedPromise)
          .finally(countSettledPromise)
      )
    );

    expect([numResolved, numRejected, numSettled]).toMatchObject([1, 9, 10]);

    expect(numResolved).toEqual(1);
    expect(numRejected).toEqual(numAttempts - 1);
    expect(numSettled).toEqual(numAttempts);

    await expect(Store.getChannel(channelId, undefined)).resolves.toMatchObject({
      latest: {turnNum: 6},
    });
  });

  // It takes ~5s to insert ten states
  const MANY_INSERTS_TIMEOUT = 10_000;
  it(
    'works when run concurrently with different channels',
    async () => {
      await Channel.query().truncate();

      numAttempts = 10;
      const channelIds = await Promise.all(
        _.range(numAttempts).map(async channelNonce => {
          const c = withSupportedState(stateVars({turnNum: 5}), {channelNonce})();
          await Channel.query().insert(c);
          return c.channelId;
        })
      );

      const t1 = Date.now();
      await Promise.all(
        channelIds.map(channelId =>
          Store.lockApp(channelId, async (tx, c) => Store.signState(channelId, next(c.latest), tx))
            .then(countResolvedPromise)
            .finally(countSettledPromise)
        )
      );
      const t2 = Date.now();

      // Roughly asserts that the `signState` calls are interwoven
      // Each `lockApp` call takes ~300 on circle:
      // https://app.circleci.com/pipelines/github/statechannels/statechannels/8354/workflows/885fce85-38f9-4d00-8696-529a86486b1f/jobs/39301
      expect((t2 - t1) / numAttempts).toBeLessThan(600);

      expect([numResolved, numRejected, numSettled]).toMatchObject([numAttempts, 0, numAttempts]);

      await expect(Store.getChannel(channelIds[1], undefined)).resolves.toMatchObject({
        latest: {turnNum: 6},
      });
    },
    MANY_INSERTS_TIMEOUT
  );

  test('sign state does not block concurrent updates', async () => {
    await Promise.all(
      _.range(numAttempts).map(() =>
        Store.signState(channelId, next(c.latest), undefined as any)
          .then(countResolvedPromise)
          .catch(countRejectedPromise)
          .finally(countSettledPromise)
      )
    );

    expect(numResolved).toEqual(10);
    expect(numRejected).toEqual(0);
    expect(numSettled).toEqual(numAttempts);

    await expect(Store.getChannel(channelId, undefined)).resolves.toMatchObject({
      latest: next(c.latest),
    });
  });
});

describe('Missing channels', () => {
  it('throws a ChannelError by default', () =>
    expect(Store.lockApp('foo', _.noop)).rejects.toThrow(
      new ChannelError(ChannelError.reasons.channelMissing, {channelId: 'foo'})
    ));

  it('calls the onChannelMissing handler when given', () =>
    expect(Store.lockApp('foo', _.noop, _.noop)).resolves.not.toThrow());

  it('calls the onChannelMissing handler with the channel Id when given', () =>
    expect(Store.lockApp('foo', _.noop, _.identity)).resolves.toEqual('foo'));
});
