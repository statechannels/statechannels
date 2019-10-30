import debug from 'debug';
import {JsonRpcErrorResponse, JsonRpcResponse} from '../../types';
import {JsonRpcErrorCodes} from '../error-codes';

const log = debug('wallet:dispatch');

const allocate = (requestId: number, result: {[key: string]: string | number | boolean}) => {
  const message: JsonRpcResponse = {jsonrpc: '2.0', id: requestId, result};
  log('Sending: %o', message);
  window.parent.postMessage(message, '*');
};

const rejectAllocation = (requestId: number) => {
  const message: JsonRpcErrorResponse = {
    jsonrpc: '2.0',
    id: requestId,
    error: {
      code: JsonRpcErrorCodes.BudgetAllocationRejected,
      message: 'User has rejected budget allocation'
    }
  };
  log('Sending: %o', message);
  window.parent.postMessage(message, '*');
};

export {allocate, rejectAllocation};
