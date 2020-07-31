import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';
import {StateVariables} from '@statechannels/wallet-core';

import {Channel} from '../../models/channel';
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

describe('concurrency', () => {
  let channelId: string;
  let numResolved: number;
  let numRejected: number;
  let numSettled: number;
  let next: StateVariables;

  let countResolvedPromise: any;
  let countRejectedPromise: any;
  let countSettledPromise: any;
  const numAttempts = 10;

  beforeEach(async () => {
    await seedAlicesSigningWallet(knex);
    const c = withSupportedState(stateVars({turnNum: 5}))();
    await Channel.query().insert(c);
    channelId = c.channelId;

    next = {...c.latest, turnNum: c.latest.turnNum + 1};

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

  it('works when run concurrently', async () => {
    await Promise.all(
      _.range(numAttempts).map(() =>
        Store.lockApp(channelId, async tx => Store.signState(channelId, next, tx))
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

  test('sign state does not block concurrent updates', async () => {
    await Promise.all(
      _.range(numAttempts).map(() =>
        Store.signState(channelId, next, undefined as any)
          .then(countResolvedPromise)
          .catch(countRejectedPromise)
          .finally(countSettledPromise)
      )
    );

    expect(numResolved).toEqual(10);
    expect(numRejected).toEqual(0);
    expect(numSettled).toEqual(numAttempts);

    await expect(Store.getChannel(channelId, undefined)).resolves.toMatchObject({
      latest: {turnNum: 6},
    });
  });
});
