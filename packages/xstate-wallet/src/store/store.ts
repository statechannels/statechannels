import {Observable} from 'rxjs';
import {BigNumber} from 'ethers/utils';
import {Participant, StateVariables, Objective, Message, SiteBudget, BudgetItem} from './types';
import {ChannelStoreEntry} from './channel-store-entry';
import {Chain} from '../chain';
import {Funding, ChannelLock} from './memory-store';

export interface Store {
  objectiveFeed: Observable<Objective>;
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

  lockFeed: Observable<ChannelLock>;
  acquireChannelLock(channelId: string): Promise<ChannelLock>;
  releaseChannelLock(lock: ChannelLock): Promise<void>;

  setLedger(ledgerId: string): Promise<void>;
  getLedger(peerId: string): Promise<ChannelStoreEntry>;

  setFunding(channelId: string, funding: Funding): Promise<void>;
  addObjective(objective: Objective): void;
  getBudget: (site: string) => Promise<SiteBudget>;
  updateOrCreateBudget: (budget: SiteBudget) => Promise<void>;
  reserveFunds(site: string, assetHolderAddress: string, amount: BudgetItem): Promise<SiteBudget>;

  chain: Chain;
}
