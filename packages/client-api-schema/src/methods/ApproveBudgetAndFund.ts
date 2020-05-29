import {Participant, Address, Uint256, DomainBudget} from '../data-types';
import {JsonRpcRequest, JsonRpcResponse} from '../utils';

export interface ApproveBudgetAndFundParams {
  hub: Participant;
  playerParticipantId: string;
  token: Address;
  requestedSendCapacity: Uint256;
  requestedReceiveCapacity: Uint256;
}

export type ApproveBudgetAndFundRequest = JsonRpcRequest<
  'ApproveBudgetAndFund',
  ApproveBudgetAndFundParams
>;
export type ApproveBudgetAndFundResponse = JsonRpcResponse<DomainBudget>;
