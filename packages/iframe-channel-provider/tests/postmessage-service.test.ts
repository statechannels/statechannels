import {JsonRpcRequest, JsonRpcResponse} from '@statechannels/client-api-schema';

import {PostMessageService} from '../src/postmessage-service';
import {IFrameService} from '../src/iframe-service';
import {logger} from '../src/logger';

type MessageResponse = {isFooBar: boolean};

describe('PostMessageService', () => {
  let postMessageService: PostMessageService;
  let uiService: IFrameService;
  let target: Window;

  const request = {
    jsonrpc: '2.0',
    id: 123,
    method: 'foo',
    params: ['bar', 1, true]
  } as JsonRpcRequest<any, any>;

  const response = {
    jsonrpc: '2.0',
    id: 123,
    result: {isFooBar: true}
  } as JsonRpcResponse<any>;

  beforeEach(async () => {
    postMessageService = new PostMessageService({timeoutMs: 1000, maxRetries: 5});
    postMessageService.setUrl('*');

    uiService = new IFrameService();

    await uiService.mount();
    target = await uiService.getTarget();
  });

  it('should send a message', () => {
    return new Promise(done => {
      target.addEventListener('message', (event: MessageEvent) => {
        const receivedMessage = event.data as JsonRpcRequest<any, any>;
        expect(receivedMessage).toEqual(request);
        done();
      });

      postMessageService.send(target, request, '*');
    });
  });

  it('should retry sending a message', () => {
    return new Promise(done => {
      const originalMessageHandler = target.onmessage;
      target.onmessage = () => ({});

      const sendSpy = jest.spyOn(postMessageService, 'send');

      jest.useFakeTimers();
      postMessageService.send(target, request, '*');
      jest.advanceTimersByTime(3000);

      expect(sendSpy).toHaveBeenCalledTimes(4);
      target.onmessage = originalMessageHandler;

      jest.useRealTimers();

      target.addEventListener('message', (event: MessageEvent) => {
        const receivedMessage = event.data as JsonRpcRequest<any, any>;
        expect(receivedMessage).toEqual(request);
        done();
      });
    });
  });

  it('should timeout sending a message when the wallet is unreachable', () => {
    target.onmessage = () => ({});

    const sendSpy = jest.spyOn(postMessageService, 'send');
    const warnSpy = jest.spyOn(logger, 'warn');

    jest.useFakeTimers();
    postMessageService.send(target, request, '*');
    jest.advanceTimersByTime(5000);

    expect(sendSpy).toHaveBeenCalledTimes(5);

    jest.useRealTimers();

    expect(warnSpy).toHaveBeenCalledWith({message: request}, 'Request timed out after 5 attempts');
  });

  it('should request and respond', async () => {
    target.onmessage = (event: MessageEvent) => {
      const receivedRequest = event.data as JsonRpcRequest<any, any>;
      expect(receivedRequest).toEqual(request);
      target.parent.postMessage(response, '*');
    };

    const result = await postMessageService.request<MessageResponse>(target, request);
    expect(result.isFooBar).toEqual(true);
  });

  it('can clear pending retries when calling acknowledge()', () => {
    target.onmessage = () => ({});

    const sendSpy = jest.spyOn(postMessageService, 'send');

    jest.useFakeTimers();
    postMessageService.send(target, request, '*');
    jest.advanceTimersByTime(2000);

    postMessageService.acknowledge();
    jest.useRealTimers();

    expect(sendSpy).toHaveBeenCalledTimes(3);
  });

  afterEach(() => {
    uiService.unmount();
  });
});
