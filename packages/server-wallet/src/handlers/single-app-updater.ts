import {WirePayload} from '../type-aliases';
import {EngineResponse} from '../wallet/wallet-response';
import {Store} from '../wallet/store';

/**
 * For making a single update to a running application channel
 * */
export class SingleAppUpdater {
  private store: Store;

  public static create(store: Store): SingleAppUpdater {
    return new SingleAppUpdater(store);
  }

  private constructor(store: Store) {
    this.store = store;
  }

  /**
   * For pushing a message containing a single update to a running application channel
   */
  async update(wirePayload: WirePayload, response: EngineResponse): Promise<void> {
    // check that we have exactly one signedState and nothing else
    if (wirePayload.signedStates?.length !== 1)
      throw new Error(`The payload sent to pushUpdate must contain exactly 1 signedState.`);
    if (wirePayload.objectives)
      throw new Error(`The payload sent to pushUpdate must not contain objectives.`);
    if (wirePayload.requests)
      throw new Error(`The payload sent to pushUpdate must not contain requests.`);

    const wireState = wirePayload.signedStates[0];
    const channelId = wireState.channelId;

    await this.store.transaction(async tx => {
      const channel = await this.store.addSignedState(channelId, wireState, tx);

      // check channel is an application channel. If not, transaction will rollback when promise rejects.
      if (!channel.isAppChannel)
        throw new Error(`The update sent to pushUpdate must be for an application channel`);

      // check that the channel is running. If not, transaction will rollback when promise rejects
      // note that this actually checks that the channel is still running _after_ the update has
      // been applied, as this is the case where no cranking is required
      if (!channel.isRunning)
        throw new Error(`The update sent to pushUpdate must be for a running channel`);

      // and add to response
      response.queueChannel(channel);
    });
  }
}
