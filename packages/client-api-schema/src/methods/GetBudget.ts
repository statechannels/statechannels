import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {DomainBudget} from '../data-types';

export interface GetBudgetParams {
  hubParticipantId: string;
}
export type GetBudgetRequest = JsonRpcRequest<'GetBudget', GetBudgetParams>;
export type GetBudgetResponse = JsonRpcResponse<DomainBudget | {}>;
