import {
  BN,
  calculateChannelId,
  Objective,
  OpenChannel,
  SignedState,
  Uint256
} from '@statechannels/wallet-core';
import _ from 'lodash';
import {map} from 'rxjs/operators';

import {ChannelStoreEntry} from './store/channel-store-entry';
import {logger} from './logger';
import {Store} from './store';
import {ChainWatcher, ChannelChainInfo} from './chain';

export {Player} from './integration-tests/helpers';
export {FakeChain} from './chain';

type Message = {
  objectives: Objective[];
  signedStates: SignedState[];
};
type Response = Message & {deposit?: boolean; currentHoldings?: string};

type Funding = {type: 'FUNDED'} | {type: 'SAFE_TO_DEPOSIT'; currentHoldings: Uint256} | undefined;

export class ClientWallet {
  private constructor(
    private chain = new ChainWatcher(),
    public store = new Store(chain),
    private registeredChannels = new Set<string>()
  ) {}

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
      const channelId = calculateChannelId(payloadState);
      if (!this.registeredChannels.has(channelId)) {
        this.chain
          .chainUpdatedFeed(channelId)
          .pipe(
            map(
              (chainInfo: ChannelChainInfo): Funding => {
                // TODO: remove this hardcoding
                if (BN.gte(chainInfo.amount, '0x08')) return {type: 'FUNDED'};
                // TODO: remove this hardcoding
                else if (BN.gte(chainInfo.amount, '0x03'))
                  return {type: 'SAFE_TO_DEPOSIT', currentHoldings: chainInfo.amount};
                else return;
              }
            )
          )
          .subscribe({
            next: async update => {
              const channel = await this.store.getEntry(channelId);
              const pk = await this.store.getPrivateKey(await this.store.getAddress());
              this.crankOpenChannelObjective(undefined, channel, update, pk);
            }
          });
      }
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
    const pk = await this.store.getPrivateKey(await this.store.getAddress());
    const response = this.crankOpenChannelObjective(objective, channel, undefined, pk);
    if (response.deposit && response.currentHoldings) {
      await this.chain.deposit(channel.channelId, response.currentHoldings, '0x03');
    }
    await this.store.addState(response.signedStates[0]);
    return response;
  }

  // Let's start with just directly funded channels
  crankOpenChannelObjective(
    objective: OpenChannel | undefined,
    channel: ChannelStoreEntry,
    funding: Funding,
    pk: string
  ): Response {
    const response: Response = {
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
      return response;
    }
    if (funding && funding.type === 'SAFE_TO_DEPOSIT') {
      response.deposit = true;
      response.currentHoldings = funding.currentHoldings;
    }
    return response;
  }
}
