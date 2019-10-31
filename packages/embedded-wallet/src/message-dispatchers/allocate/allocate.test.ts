import {JsonRpcErrorResponse, JsonRpcResponse} from '@statechannels/channel-provider';
import {allocate, rejectAllocation} from './allocate';

describe('MessageDispatchers - Allocate', () => {
  it('should dispatch a JSONRPC call with the `allocate` method', async done => {
    window.onmessage = (event: MessageEvent) => {
      const response = event.data as JsonRpcResponse;
      if (!response.jsonrpc) {
        fail('Expected a JSONRPC response');
      } else {
        expect(response.jsonrpc).toEqual('2.0');
        expect('error' in response).toEqual(false);
        expect(response.result).toEqual({allocated: true});
        expect(response.id).toEqual(123);
      }
      done();
    };
    allocate(123, {allocated: true});
  });

  it('should dispatch a JSONRPC call with the `rejectAllocation` method', async done => {
    window.onmessage = (event: MessageEvent) => {
      const response = event.data as JsonRpcErrorResponse;
      if (!response.jsonrpc) {
        fail('Expected a JSONRPC response');
      } else {
        expect(response.jsonrpc).toEqual('2.0');
        expect('result' in response).toEqual(false);
        expect(response.error).toEqual({
          code: -32100,
          message: 'User has rejected budget allocation'
        });
        expect(response.id).toEqual(123);
      }
      done();
    };
    rejectAllocation(123);
  });
});
