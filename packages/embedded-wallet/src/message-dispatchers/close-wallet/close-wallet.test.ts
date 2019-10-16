import {closeWallet} from './close-wallet';

describe('MessageDispatchers - CloseWallet', () => {
  it('should dispatch a non-JSONRPC call with the `ui:wallet:close` message', async done => {
    window.onmessage = (event: MessageEvent) => {
      const message = event.data as string;
      if (typeof message !== 'string') {
        fail('Expected a non JSONRPC response');
      } else {
        expect(message).toEqual('ui:wallet:close');
      }
      done();
    };
    closeWallet();
  });
});
