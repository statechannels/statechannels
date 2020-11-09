import {hasSupportedState, isMyTurn} from '../handlers/helpers';
import {Bytes32} from '../type-aliases';
import {Store} from '../wallet/store';
import {WalletError, Values} from '../errors/wallet-error';

export class CloseChannelObjective {
  public static async commence(
    channelId: Bytes32,
    response: ResponseBuilder,
    store: Store
  ): Promise<void> {
    await store.lockApp(
      channelId,
      async (tx, channel) => {
        if (hasSupportedState(channel) && !isMyTurn(channel))
          throw new CloseChannelError(CloseChannelError.reasons.notMyTurn);

        const dbObjective = await store.addObjective(
          {
            type: 'CloseChannel',
            participants: [],
            data: {targetChannelId: channelId, fundingStrategy: channel.fundingStrategy},
          },
          tx
        );
        // add new objective to the response
        response.objectiveCreated(dbObjective, channel.myIndex, channel.participants);
      },
      () => {
        throw new CloseChannelError(CloseChannelError.reasons.channelMissing, {channelId});
      }
    );
  }
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
