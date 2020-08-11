import {Either, left, right, chain, map} from 'fp-ts/lib/Either';
import {StateVariables} from '@statechannels/wallet-core';
import {pipe} from 'fp-ts/lib/function';
import {ChannelId} from '@statechannels/client-api-schema';

import {SignState, signState} from '../protocols/actions';
import {ChannelState, ChannelStateWithSupported} from '../protocols/state';
import {WalletError, Values} from '../errors/wallet-error';

import {hasSupportedState, isMyTurn, supported} from './helpers';

type HandlerResult = Either<CloseChannelError, SignState>;
type StepResult = Either<CloseChannelError, ChannelStateWithSupported>;

export interface CloseChannelHandlerParams {
  channelId: ChannelId;
}

export class CloseChannelError extends WalletError {
  readonly type = WalletError.errors.CloseChannelError;

  static readonly reasons = {
    noSupportedState: 'no supported state',
    notMyTurn: 'not my turn',
    channelMissing: 'channel not found',
  } as const;

  constructor(
    reason: Values<typeof CloseChannelError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}

const ensureSupportedStateExists = (
  cs: ChannelState
): Either<CloseChannelError, ChannelStateWithSupported> =>
  hasSupportedState(cs)
    ? right(cs)
    : left(new CloseChannelError(CloseChannelError.reasons.noSupportedState));

function ensureItIsMyTurn(cs: ChannelStateWithSupported): StepResult {
  if (isMyTurn(cs)) return right(cs);
  return left(new CloseChannelError(CloseChannelError.reasons.notMyTurn));
}

export function closeChannel(channelState: ChannelState): HandlerResult {
  const {channelId} = channelState;
  const signStateAction = (sv: StateVariables): SignState =>
    signState({...sv, channelId, isFinal: true, turnNum: sv.turnNum + 1});

  return pipe(
    channelState,
    ensureSupportedStateExists,
    chain(ensureItIsMyTurn),
    map(supported),
    map(signStateAction)
  );
}
