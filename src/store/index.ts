import {Store} from './store';
import {filter, map} from 'rxjs/operators';
import {StateVariables} from './types';

export {Store} from './store';
export * from './types';

// TODO: Move to somewhere better?
export function supportedStateFeed(store: Store, channelId: string) {
  return store.channelUpdatedFeed(channelId).pipe(
    filter(e => !!e.supported),
    map(e => ({state: {...(e.supported as StateVariables), ...e.channelConstants}}))
  );
}

interface DirectFunding {
  type: 'Direct';
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

export interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
}

interface Guarantee {
  type: 'Guarantee';
  guarantorChannelId: string;
}

interface Guarantees {
  type: 'Guarantees';
  guarantorChannelIds: [string, string];
}
export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guarantees | Guarantee;
export function isIndirectFunding(funding): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding): funding is Guarantee {
  return funding.type === 'Guarantee';
}
export function isGuarantees(funding): funding is Guarantees {
  return funding.type === 'Guarantees';
}

export enum Errors {
  duplicateTurnNums = 'multiple states with same turn number',
  notSorted = 'states not sorted',
  multipleSignedStates = 'Store signed multiple states for a single turn',
  staleState = 'Attempting to sign a stale state',
  channelMissing = 'No channel found with id.',
  channelFunded = 'Channel already funded.',
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for domain. ',
  noAssetBudget = "This domain's budget does contain this asset",
  channelNotInBudget = "This domain's budget does not reference this channel",
  noDomainForChannel = 'No domain defined for channel',
  domainExistsOnChannel = 'Channel already has a domain.',
  budgetAlreadyExists = 'There already exists a budget for this domain',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget',
  cannotFindDestination = 'Cannot find destination for participant',
  cannotFindPrivateKey = 'Private key missing for your address',
  notInChannel = 'Attempting to initialize  channel as a non-participant',
  noLedger = 'No ledger exists with peer',
  amountNotFound = 'Cannot find allocation entry with destination',
  invalidNonce = 'Invalid nonce',
  emittingDuringTransaction = 'Attempting to emit event during transaction'
}
