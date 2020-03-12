import {Observable} from 'rxjs';
import {BigNumber} from 'ethers/utils';
import {Participant, StateVariables, Objective, Message, SiteBudget} from './types';
import {ChannelStoreEntry} from './channel-store-entry';
import {Chain} from '../chain';
import {Funding, LedgerStatus, LedgerUpdated} from './memory-store';
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

  ledgerFeed: Observable<LedgerUpdated>;
  lockLedger(participantId: string): Promise<LedgerUpdated>;
  releaseLedger(status: LedgerStatus): Promise<void>;
  getLedger(peerId: string): Promise<ChannelStoreEntry>;

  setFunding(channelId: string, funding: Funding): Promise<void>;
  addObjective(objective: Objective): void;
  getBudget: (site: string) => Promise<SiteBudget | undefined>;
  updateOrCreateBudget: (budget: SiteBudget) => Promise<void>;

  chain: Chain;
}
