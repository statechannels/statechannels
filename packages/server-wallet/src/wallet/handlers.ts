import {Either, left, right, chain, ap, map} from 'fp-ts/lib/Either';
import {Option} from 'fp-ts/lib/Option';
import {SignedStateWithHash} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';

import {ProtocolAction} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

import {UpdateChannelParams} from '.';

type HandlerResult = Either<Error, Option<ProtocolAction>>;

// Check that the channel is:
// - Is funded.
// - No challenge exists.
// - In the running state.
// - It is my turn to update

// Then:
// - Create and sign new state.
// - Check if any other actions need to be taken.

export function updateChannel(
  args: UpdateChannelParams,
  channelState: ChannelState
): HandlerResult {
  // TODO: check if the channel is funded and that no challenge exists once that data is part of the ChannelState
  const latestIfExists = (cs: ChannelState): Either<Error, SignedStateWithHash> =>
    cs.latest ? right(cs.latest) : left(new Error('updateChannel: must have latest state'));
  const runningTurnNumber = (ss: SignedStateWithHash): Either<Error, SignedStateWithHash> =>
    ss.turnNum < 3 ? left(new Error('updateChannel: channel must be in running state')) : right(ss);
  pipe(channelState, latestIfExists, chain(runningTurnNumber));
}
