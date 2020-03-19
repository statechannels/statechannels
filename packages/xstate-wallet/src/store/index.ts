export {Store} from './store';

export enum Errors {
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for this site',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget'
}
