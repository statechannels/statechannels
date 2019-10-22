import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';
import {askForFunds, connectToWallet, makeWalletRequest} from './embedded-wallet-client';

describe('Embedded Wallet Client', () => {
  let request: jest.Mock;
  let enable: jest.Mock;

  beforeEach(() => {
    request = jest.fn();
    enable = jest.fn();

    window.EmbeddedWallet = {request, enable};
  });

  describe('connectToWallet()', () => {
    it('should enable the wallet', () => {
      connectToWallet();

      expect(enable).toHaveBeenCalledWith(process.env.REACT_APP_EMBEDDED_WALLET_URL);
    });

    it('should log an error if something goes wrong', () => {
      const error = new Error(
        'If you are seeing this error in a test, do not worry; we are testing that the wallet client can report that something went wrong'
      );
      window.EmbeddedWallet.enable = jest.fn(() => {
        throw error;
      });

      const logSpy = jest.spyOn(console, 'log');

      connectToWallet();
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

      window.EmbeddedWallet.request = jest.fn(async () => mockResponse);

      try {
        const result = await makeWalletRequest(mockRequest);
        expect(result.id).toEqual(mockRequest.id);
        expect(result.error).toBeUndefined();
        expect(result.result).toEqual({foo: true});
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

      window.EmbeddedWallet.request = jest.fn(async () => {
        throw error;
      });

      try {
        await makeWalletRequest(mockRequest);
        fail('This request should not pass');
      } catch (err) {
        expect(err).toEqual(error);
      }
    });
  });

  describe('askForFunds()', () => {
    it('should enable the wallet and send a request', async () => {
      window.EmbeddedWallet.request = jest.fn(async () => ({
        jsonrpc: '2.0',
        id: 123,
        result: {done: true}
      }));

      const response = await askForFunds();

      expect(enable).toHaveBeenCalled();
      expect(window.EmbeddedWallet.request).toHaveBeenCalled();
      expect(response.result).toEqual({done: true});
    });
  });

  afterEach(() => {
    request.mockReset();
    enable.mockReset();
  });
});
