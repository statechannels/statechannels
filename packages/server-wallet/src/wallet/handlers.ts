import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {Option, none} from 'fp-ts/lib/Option';
import {
  SignedStateWithHash,
  deserializeAllocations,
  StateVariables,
} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';

import {ProtocolAction} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

import {UpdateChannelParams} from '.';

type HandlerResult = Either<Error, Option<ProtocolAction>>;
type ValidateState = (ss: SignedStateWithHash) => Either<Error, SignedStateWithHash>;

// Open questions:
// - What is responsible for querying the store for an channel entry?
// - What is responsible for deserializing data from the application?
// - How do we figure out what other actions need to be taken?
export function updateChannel(
  args: UpdateChannelParams,
  channelState: ChannelState
): HandlerResult {
  // todo: check if the channel is funded and that no challenge exists once that data is part of the ChannelState
  const latestIfExists = (cs: ChannelState): Either<Error, SignedStateWithHash> =>
    cs.latest ? right(cs.latest) : left(new Error('updateChannel: must have latest state'));
  const hasRunningTurnNumber: ValidateState = ss =>
    ss.turnNum < 3 ? left(new Error('updateChannel: channel must be in running state')) : right(ss);
  const isMyTurn: ValidateState = ss =>
    ss.turnNum % channelState.myIndex
      ? right(ss)
      : left(new Error('updateChanne: it is not my turn'));
  const newState = (ss: SignedStateWithHash): StateVariables => ({
    outcome: deserializeAllocations(args.allocations),
    turnNum: ss.turnNum + 1,
    appData: args.appData,
    isFinal: false,
  });

  const finalAction = (_sv: StateVariables): Option<ProtocolAction> => none;

  // todo:
  // - ask the store to sign and add the new state.
  // - check if other actions need to be taken.
  return pipe(
    channelState,
    latestIfExists,
    chain(hasRunningTurnNumber),
    chain(isMyTurn),
    map(newState),
    map(finalAction)
  );
}
