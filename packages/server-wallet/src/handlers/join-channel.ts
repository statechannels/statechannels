import {ChannelId} from '@statechannels/client-api-schema';

import {EngineError, Values} from '../errors/engine-error';

export interface JoinChannelHandlerParams {
  channelId: ChannelId;
}

export class JoinChannelError extends EngineError {
  readonly type = EngineError.errors.JoinChannelError;

  static readonly reasons = {
    channelNotFound: 'channel not found',
    invalidTurnNum: 'latest state must be turn 0',
    alreadySignedByMe: 'already signed prefund setup',
  } as const;

  constructor(
    reason: Values<typeof JoinChannelError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}
