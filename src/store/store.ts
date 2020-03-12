import {Observable} from 'rxjs';
import {BigNumber} from 'ethers/utils';
import {Participant, StateVariables, Objective, Message, SiteBudget} from './types';
import {ChannelStoreEntry} from './channel-store-entry';
import {Chain} from '../chain';
import {Funding} from './memory-store';

export interface Store {
  newObjectiveFeed: Observable<Objective>;
  outboxFeed: Observable<Message>;
  pushMessage: (message: Message) => Promise<void>;
  channelUpdatedFeed(channelId: string): Observable<ChannelStoreEntry>;
  getAddress(): string;
  signAndAddState(channelId: string, stateVars: StateVariables): Promise<void>;
  createChannel(
    participants: Participant[],
    challengeDuration: BigNumber,
    stateVars: StateVariables,
    appDefinition?: string
  ): Promise<ChannelStoreEntry>;
  getEntry(channelId): Promise<ChannelStoreEntry>;
  getLedger(peerId: string): Promise<ChannelStoreEntry>;

  setLedger(channelId: string): Promise<void>;
  // TODO: This is awkward. Might be better to set the funding on create/initialize channel?
  setFunding(channelId: string, funding: Funding): Promise<void>;
  // TODO: I don't know how the store is mean to send outgoing messages.
  // But I need one, in order to implement virtual funding.
  addObjective(objective: Objective): void;
  // TODO: should this be exposed via the Store?
  chain: Chain;
  getBudget: (site: string) => Promise<SiteBudget | undefined>;
  updateOrCreateBudget: (budget: SiteBudget) => Promise<void>;
}
