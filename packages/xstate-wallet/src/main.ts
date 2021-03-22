import {
  BN,
  calculateChannelId,
  Objective,
  SignedState,
  Uint256,
  unreachable
} from '@statechannels/wallet-core';
import _ from 'lodash';
import {map} from 'rxjs/operators';

import {ChannelStoreEntry} from './store/channel-store-entry';
import {logger} from './logger';
import {Store} from './store';
import {ChainWatcher, ChannelChainInfo} from './chain';

export type Message = {
  objectives: Objective[];
  signedStates: SignedState[];
};
type Response = Message & {deposit?: boolean; currentHoldings?: string};

type Funding =
  | {type: 'FUNDED'}
  | {type: 'DEPOSITED'}
  | {type: 'SAFE_TO_DEPOSIT'; currentHoldings: Uint256}
  | undefined;
type OnNewMessage = (message: Message) => void;

export class ClientWallet {
  private constructor(
    private onNewMessage: OnNewMessage,
    private chain = new ChainWatcher(),
    public store = new Store(chain),
    private registeredChannels = new Set<string>(),
    private latestFunding: Funding = undefined
  ) {}

  private async init(): Promise<ClientWallet> {
    await this.store.initialize();
    return this;
  }

  static async create(onNewMessage: OnNewMessage): Promise<ClientWallet> {
    return new ClientWallet(onNewMessage).init();
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
              const latestType = this.latestFunding?.type;
              switch (latestType) {
                case 'FUNDED':
                  return;
                case 'DEPOSITED':
                  if (update?.type === 'FUNDED') break;
                  return;
                case 'SAFE_TO_DEPOSIT':
                  if (update?.type === 'FUNDED') break;
                  return;
                case undefined:
                  break;
                default:
                  unreachable(latestType);
              }
              this.latestFunding = update;
              await this.onOpenChannelObjective(channelId);
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
          response = await this.onOpenChannelObjective(objective.data.targetChannelId);
          break;
        }
        default:
          throw new Error('Objective not supported');
      }
    }
    return response;
  }

  async onOpenChannelObjective(channelId: string): Promise<Message> {
    const channel = await this.store.getEntry(channelId);
    const pk = await this.store.getPrivateKey(await this.store.getAddress());
    const response = this.crankOpenChannelObjective(channel, this.latestFunding, pk);
    if (response.deposit && response.currentHoldings) {
      this.latestFunding = {type: 'DEPOSITED'};
      // TODO: remove this hardcoding
      await this.chain.deposit(channel.channelId, response.currentHoldings, '0x05');
    }
    if (response.signedStates[0]) {
      await this.store.addState(response.signedStates[0]);
      this.onNewMessage(response);
    }
    return response;
  }

  // Let's start with just directly funded channels
  crankOpenChannelObjective(channel: ChannelStoreEntry, funding: Funding, pk: string): Response {
    const response: Response = {
      objectives: [],
      signedStates: []
    };
    const {latestState} = channel;
    // Prefund state
    if (latestState.turnNum === 0 && !channel.isSupportedByMe) {
      const newState = channel.signAndAdd(
        _.pick(latestState, 'outcome', 'turnNum', 'appData', 'isFinal'),
        pk
      );

      response.signedStates = [{..._.omit(newState, 'stateHash')}];
      return response;
    }
    if (funding && funding.type === 'SAFE_TO_DEPOSIT') {
      response.deposit = true;
      response.currentHoldings = funding.currentHoldings;
    }
    if (funding && funding.type === 'FUNDED') {
      if (latestState.turnNum === 3 && channel.latestSignedByMe.turnNum === 0) {
        const newState = channel.signAndAdd(
          _.pick(latestState, 'outcome', 'turnNum', 'appData', 'isFinal'),
          pk
        );

        response.signedStates = [{..._.omit(newState, 'stateHash')}];
        return response;
      }
    }
    return response;
  }
}
