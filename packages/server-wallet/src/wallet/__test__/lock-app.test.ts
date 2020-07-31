import _ from 'lodash';
import {ChannelResult} from '@statechannels/client-api-schema';

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

it('works when run concurrently', async () => {
  await seedAlicesSigningWallet(knex);
  const c = withSupportedState(stateVars({turnNum: 5}))();
  await Channel.query().insert(c);

  const {channelId, latest} = c;
  const next = {...latest, turnNum: latest.turnNum + 1};

  const numAttempts = 10;
  let numResolved = 0;
  let numRejected = 0;
  let numSettled = 0;
  const countResolvedPromise = ({channelResult}: {channelResult: ChannelResult}): any => {
    expect(channelResult).toMatchObject({turnNum: 6});
    numResolved += 1;
  };
  const countRejectedPromise = (error: Error): any => {
    expect(error).toMatchObject(new Error('Stale state'));
    numRejected += 1;
  };
  const countSettledPromise = (): any => (numSettled += 1);

  await Promise.all(
    _.range(numAttempts).map(() =>
      Store.lockApp(channelId, async tx => Store.signState(channelId, next, tx))
        .then(countResolvedPromise)
        .catch(countRejectedPromise)
        .finally(countSettledPromise)
    )
  );

  expect(numResolved).toEqual(1);
  expect(numRejected).toEqual(numAttempts - 1);
  expect(numSettled).toEqual(numAttempts);

  await expect(Store.getChannel(channelId, undefined)).resolves.toMatchObject({
    latest: {turnNum: 6},
  });
});
