import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {StateVariables} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';
import {ChannelId} from '@statechannels/client-api-schema';

import {SignState} from '../protocols/actions';
import {ChannelState} from '../protocols/state';

type HandlerResult = Either<JoinChannelError, SignState>;
type StepResult = Either<JoinChannelError, ChannelState>;
export interface JoinChannelHandlerParams {
  channelId: ChannelId;
}

export enum Errors {
  channelNotFound = 'channel not found',
  invalidTurnNum = 'latest state must be turn 0',
  alreadySignedByMe = 'already signed prefund setup',
}

export class JoinChannelError extends Error {
  readonly type = 'JoinChannelError';
  constructor(reason: Errors, public readonly data: any = undefined) {
    super(reason);
  }
}

// The helper functions should be factored out, tested, and reusable
const hasStateSignedByMe = (cs: ChannelState): boolean => !!cs.latestSignedByMe;

const ensureNotSignedByMe = (cs: ChannelState): Either<JoinChannelError, ChannelState> =>
  hasStateSignedByMe(cs) ? left(new JoinChannelError(Errors.alreadySignedByMe)) : right(cs);

function ensureLatestStateIsPrefundSetup(cs: ChannelState): StepResult {
  if (cs.latest.turnNum === 0) return right(cs);
  return left(new JoinChannelError(Errors.invalidTurnNum));
}

function latest(cs: ChannelState): StateVariables {
  return cs.latest;
}
// End helpers

export function joinChannel(
  args: JoinChannelHandlerParams,
  channelState: ChannelState
): HandlerResult {
  // TODO: use Action creator from another branch
  const signStateAction = (sv: StateVariables): SignState => ({
    type: 'SignState',
    channelId: args.channelId,
    ...sv,
  });

  return pipe(
    channelState,
    ensureNotSignedByMe,
    chain(ensureLatestStateIsPrefundSetup),
    map(latest),
    map(signStateAction)
  );
}
