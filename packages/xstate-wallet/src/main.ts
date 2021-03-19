import {Objective, OpenChannel, SignedState} from '@statechannels/wallet-core';
import _ from 'lodash';

import {ChannelStoreEntry} from './store/channel-store-entry';
import {logger} from './logger';
import {Store} from './store';

export {Player} from './integration-tests/helpers';
export {FakeChain} from './chain';

type Message = {
  objectives: Objective[];
  signedStates: SignedState[];
};

export class ClientWallet {
  public store: Store;

  private constructor() {
    this.store = new Store();
  }

  private async init(): Promise<ClientWallet> {
    await this.store.initialize();
    return this;
  }

  static async create(): Promise<ClientWallet> {
    return new ClientWallet().init();
  }

  async incomingMessage(payload: Message): Promise<Message> {
    let response: Message = {
      objectives: [],
      signedStates: []
    };
    // Store any new objectives
    const payloadObjective = payload.objectives?.[0];
    if (!payloadObjective) {
      logger.info('No incoming objectives');
    } else {
      await this.store.addObjective(payloadObjective);
    }

    // Store any new states
    const payloadState = payload.signedStates?.[0];
    if (!payloadState) {
      logger.info('No incoming states');
    } else {
      await this.store.addState(payloadState);
    }

    // Fetch channels for the objective
    // Run protocol
    // Store output of protocol to the store
    for (const objective of this.store.objectives) {
      switch (objective.type) {
        case 'OpenChannel': {
          response = await this.onOpenChannelObjective(objective);
          break;
        }
        default:
          throw new Error('Objective not supported');
      }
    }
    return response;
  }

  async onOpenChannelObjective(objective: OpenChannel): Promise<Message> {
    const channel = await this.store.getEntry(objective.data.targetChannelId);
    const response = this.crankOpenChannelObjective(
      objective,
      channel,
      await this.store.getPrivateKey(await this.store.getAddress())
    );
    this.store.addState(response.signedStates[0]);
    return response;
  }

  // Let's start with just directly funded channels
  crankOpenChannelObjective(
    objective: OpenChannel,
    channel: ChannelStoreEntry,
    pk: string
  ): Message {
    const response: Message = {
      objectives: [],
      signedStates: []
    };
    const {latestState} = channel;
    // Prefund state
    if (latestState.turnNum === 0) {
      if (!channel.isSupportedByMe) {
        const newState = channel.signAndAdd(
          _.pick(latestState, 'outcome', 'turnNum', 'appData', 'isFinal'),
          pk
        );

        response.signedStates = [{..._.omit(newState, 'stateHash')}];
      }
    }
    return response;
  }
}
