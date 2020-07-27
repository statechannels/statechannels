import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {SignedStateWithHash, StateVariables, Outcome} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';
import {ChannelId} from '@statechannels/client-api-schema';
import {curry} from 'lodash';

import {ProtocolAction, SignState} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

type ChannelStateWithSupported = ChannelState & {
  supported: SignedStateWithHash;
  latestSignedByMe: SignedStateWithHash;
};

type HandlerResult = Either<Error, ProtocolAction>;
type StepResult = Either<Error, ChannelStateWithSupported>;
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

const hasSupportedState = (cs: ChannelState): cs is ChannelStateWithSupported => !!cs.supported;

// The helper functions should be factored out, tested, and reusable
const ensureSupportedStateExists = (
  cs: ChannelState
): Either<UpdateChannelError, ChannelStateWithSupported> =>
  hasSupportedState(cs) ? right(cs) : left(new UpdateChannelError(Errors.invalidLatestState));

function isMyTurn(cs: ChannelStateWithSupported): StepResult {
  if (cs.supported.turnNum + (1 % cs.supported.participants.length) === cs.myIndex)
    return right(cs);
  return left(new UpdateChannelError(Errors.notMyTurn));
}

function hasRunningTurnNumber(cs: ChannelStateWithSupported): StepResult {
  if (cs.supported.turnNum < 3) return left(new UpdateChannelError(Errors.notInRunningStage));
  return right(cs);
}

const incrementTurnNumber = (args: UpdateChannelHandlerParams) => (
  cs: ChannelStateWithSupported
): StateVariables => ({
  ...args,
  turnNum: cs.supported.turnNum + 1,
  isFinal: false,
});
// END helper functions

// todo: check if the channel is funded and that no challenge exists once that data is part of the ChannelState
export function updateChannel(
  args: UpdateChannelHandlerParams,
  channelState: ChannelState
): HandlerResult {
  // todo: use Action creator from another branch
  const signStateAction = (sv: StateVariables): SignState => ({
    type: 'SignState',
    channelId: args.channelId,
    ...sv,
  });

  return pipe(
    channelState,
    ensureSupportedStateExists,
    chain(hasRunningTurnNumber),
    chain(isMyTurn),
    map(curry(incrementTurnNumber)(args)),
    map(signStateAction)
  );
}
