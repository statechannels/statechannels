import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';
import {askForFunds, connectToWallet, makeWalletRequest} from './embedded-wallet-client';

describe('Embedded Wallet Client', () => {
  let send: jest.Mock;
  let enable: jest.Mock;

  beforeEach(() => {
    send = jest.fn();
    enable = jest.fn();

    window.channelProvider = {send, enable};
  });

  describe('connectToWallet()', () => {
    it('should enable the wallet', async () => {
      await connectToWallet();

      expect(enable).toHaveBeenCalledWith(process.env.REACT_APP_EMBEDDED_WALLET_URL);
    });

    it('should log an error if something goes wrong', async () => {
      const error = new Error(
        'If you are seeing this error in a test, do not worry; we are testing that the wallet client can report that something went wrong'
      );
      window.channelProvider.enable = jest.fn(async () => {
        throw error;
      });

      const logSpy = jest.spyOn(console, 'log');

      await connectToWallet();
      expect(logSpy).toHaveBeenNthCalledWith(1, 'Error while connecting to wallet');
      expect(logSpy).toHaveBeenNthCalledWith(2, error.stack);
    });
  });

  describe('makeWalletRequest()', () => {
    it('should be able to send a message to the wallet', async () => {
      const mockRequest: JsonRPCRequest = {
        jsonrpc: '2.0',
        method: 'chan_foo',
        id: 123,
        params: ['bar', 'foo', false, 5]
      };

      const mockResponse: JsonRPCResponse = {
        jsonrpc: '2.0',
        id: 123,
        result: {foo: true}
      };

      window.channelProvider.send = jest.fn(async () => mockResponse.result);

      try {
        const result = await makeWalletRequest(mockRequest.method, mockRequest.params);
        expect(result).toEqual({foo: true});
      } catch {
        fail('This request should not fail');
      }
    });

    it('should throw an error if something goes wrong when sending a message', async () => {
      const error = new Error(
        'If you are seeing this error in a test, do not worry; we are testing that the wallet client can report that something went wrong'
      );

      const mockRequest: JsonRPCRequest = {
        jsonrpc: '2.0',
        method: 'chan_foo',
        id: 123,
        params: ['bar', 'foo', false, 5]
      };

      window.channelProvider.send = jest.fn(async () => {
        throw error;
      });

      try {
        await makeWalletRequest(mockRequest.method, mockRequest.params);
        fail('This request should not pass');
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('askForFunds()', () => {
    it('should enable the wallet and send a request', async () => {
      window.channelProvider.send = jest.fn(async () => ({
        done: true
      }));

      const response = await askForFunds();

      expect(enable).toHaveBeenCalled();
      expect(window.channelProvider.send).toHaveBeenCalled();
      expect(response).toEqual({done: true});
    });
  });

  afterEach(() => {
    send.mockReset();
    enable.mockReset();
  });
});
