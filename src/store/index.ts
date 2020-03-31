import {Store} from './store';
import {filter, map} from 'rxjs/operators';
import {StateVariables} from './types';

export {Store, XstateStore} from './store';

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
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for this site',
  noSiteForChannel = 'No site defined for channel',
  budgetAlreadyExists = 'There already exists a budget for this site',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget',
  cannotFindDestination = 'Cannot find destination for participant'
}
