import {JsonRpcRequest, JsonRpcResponse} from '../utils';
import {Address, DomainBudget} from '../data-types';

export type GetBudgetParams = {hubAddress: string};
export type GetBudgetRequest = JsonRpcRequest<'GetBudget', {hubAddress: Address}>;
export type GetBudgetResponse = JsonRpcResponse<DomainBudget | {}>;
