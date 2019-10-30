import {JsonRpcResponse} from '../../types';
import {allocate} from './allocate';

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
});
