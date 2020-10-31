import {ChannelId} from '@statechannels/client-api-schema';

import {WalletError, Values} from '../errors/wallet-error';

export interface JoinChannelHandlerParams {
  channelId: ChannelId;
}

export class JoinChannelError extends WalletError {
  readonly type = WalletError.errors.JoinChannelError;

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
