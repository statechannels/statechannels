import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {SignedStateWithHash, StateVariables, Outcome} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';
import {ChannelId} from '@statechannels/client-api-schema';

import {ProtocolAction, SignState} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

type ChannelStateWithSupported = ChannelState & {
  supported: SignedStateWithHash;
};

type HandlerResult = Either<Error, ProtocolAction>;
type ValidateState = (ss: ChannelStateWithSupported) => Either<Error, ChannelStateWithSupported>;
export interface UpdateChannelHandlerParams {
  channelId: ChannelId;
  outcome: Outcome;
  appData: string;
}

enum Errors {
  invalidLatestState = 'must have latest state',
  notInRunningStage = 'channel must be in running state',
  notMyTurn = 'it is not my turn',
}

class UpdateChannelError extends Error {
  readonly type = 'UpdateChannelError';
  constructor(reason: Errors, public readonly data: any = undefined) {
    super(reason);
  }
}

export function updateChannel(
  args: UpdateChannelHandlerParams,
  channelState: ChannelState
): HandlerResult {
  // todo: check if the channel is funded and that no challenge exists once that data is part of the ChannelState
  const ensureSupportedStateExists = (
    cs: ChannelState
  ): Either<UpdateChannelError, ChannelStateWithSupported> =>
    cs.supported
      ? right({...cs, supported: cs.supported})
      : left(new UpdateChannelError(Errors.invalidLatestState));
  const hasRunningTurnNumber: ValidateState = cs =>
    cs.supported.turnNum < 3 ? left(new UpdateChannelError(Errors.notInRunningStage)) : right(cs);
  const isMyTurn: ValidateState = ss =>
    ss.supported.turnNum % channelState.myIndex
      ? right(ss)
      : left(new UpdateChannelError(Errors.notMyTurn));
  const newState = (cs: ChannelStateWithSupported): StateVariables => ({
    ...args,
    turnNum: cs.supported.turnNum + 1,
    isFinal: false,
  });

  // todo: use Action creator from another branch
  const finalAction = (sv: StateVariables): SignState => ({
    type: 'SignState',
    channelId: args.channelId,
    ...sv,
  });

  return pipe(
    channelState,
    ensureSupportedStateExists,
    chain(hasRunningTurnNumber),
    chain(isMyTurn),
    map(newState),
    map(finalAction)
  );
}
