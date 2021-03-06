import {Bytes32} from '../type-aliases';
import {Store} from '../engine/store';
import {EngineError, Values} from '../errors/engine-error';
import {EngineResponse} from '../engine/engine-response';
import {ObjectiveModel} from '../models/objective';

export class CloseChannelObjective {
  public static async commence(
    channelId: Bytes32,
    response: EngineResponse,
    store: Store
  ): Promise<void> {
    await store.lockApp(
      channelId,
      async (tx, channel) => {
        const walletObjective = await ObjectiveModel.insert(
          {
            type: 'CloseChannel',
            participants: [],
            data: {
              targetChannelId: channelId,
              fundingStrategy: channel.fundingStrategy,
              txSubmitterOrder: [1, 0],
            },
          },

          tx,
          'approved'
        );
        // add new objective to the response
        response.queueCreatedObjective(walletObjective, channel.myIndex, channel.participants);
      },
      () => {
        throw new CloseChannelError(CloseChannelError.reasons.channelMissing, {channelId});
      }
    );
  }
}

export class CloseChannelError extends EngineError {
  readonly type = EngineError.errors.CloseChannelError;

  static readonly reasons = {
    channelMissing: 'channel not found',
  } as const;

  constructor(
    reason: Values<typeof CloseChannelError.reasons>,
    public readonly data: any = undefined
  ) {
    super(reason);
  }
}
