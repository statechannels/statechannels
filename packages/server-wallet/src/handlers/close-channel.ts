import {ChannelId} from '@statechannels/client-api-schema';

import {WalletError, Values} from '../errors/wallet-error';

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
