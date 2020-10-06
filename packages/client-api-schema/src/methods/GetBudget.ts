import {JsonRpcRequest, JsonRpcResponse} from '../jsonrpc-header-types';
import {DomainBudget} from '../data-types';

export interface GetBudgetParams {
  hubParticipantId: string;
}
export type GetBudgetRequest = JsonRpcRequest<'GetBudget', GetBudgetParams>;
// eslint-disable-next-line @typescript-eslint/ban-types
export type GetBudgetResponse = JsonRpcResponse<DomainBudget | {}>;
