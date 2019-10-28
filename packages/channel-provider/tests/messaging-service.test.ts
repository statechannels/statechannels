import {JsonRPCRequest, JsonRPCResponse} from 'web3/providers';
import {MessagingService} from '../src/messaging-service';
import {UIService} from '../src/ui-service';

type MessageResponse = {isFooBar: boolean};

describe('MessagingService', () => {
  let messagingService: MessagingService;
  let uiService: UIService;
  let target: Window;

  const request = {
    jsonrpc: '2.0',
    id: 123,
    method: 'foo',
    params: ['bar', 1, true]
  } as JsonRPCRequest;

  const response = {
    jsonrpc: '2.0',
    id: 123,
    result: {isFooBar: true}
  } as JsonRPCResponse;

  beforeEach(async () => {
    messagingService = new MessagingService();
    messagingService.setUrl('*');

    uiService = new UIService();

    await uiService.mount();
    target = await uiService.getTarget();
  });

  it('should send a message', done => {
    target.addEventListener('message', (event: MessageEvent) => {
      const receivedMessage = event.data as JsonRPCRequest;
      expect(receivedMessage).toEqual(request);
      done();
    });

    messagingService.send(target, request, '*');
  });

  it('should retry sending a message', done => {
    const originalMessageHandler = target.onmessage;
    target.onmessage = () => ({});

    const sendSpy = jest.spyOn(messagingService, 'send');

    jest.useFakeTimers();
    messagingService.send(target, request, '*');
    jest.advanceTimersByTime(150);

    expect(sendSpy).toHaveBeenCalledTimes(4);
    target.onmessage = originalMessageHandler;

    jest.useRealTimers();

    target.addEventListener('message', (event: MessageEvent) => {
      const receivedMessage = event.data as JsonRPCRequest;
      expect(receivedMessage).toEqual(request);
      done();
    });
  });

  it('should timeout sending a message when the wallet is unreachable', () => {
    target.onmessage = () => ({});

    const sendSpy = jest.spyOn(messagingService, 'send');
    const warnSpy = jest.spyOn(console, 'warn');

    jest.useFakeTimers();
    messagingService.send(target, request, '*');
    jest.advanceTimersByTime(300);

    expect(sendSpy).toHaveBeenCalledTimes(5);

    jest.useRealTimers();

    expect(warnSpy).toHaveBeenCalledWith('Request timed out after 5 attempts', request);
  });

  it('should request and respond', async () => {
    target.onmessage = (event: MessageEvent) => {
      const receivedRequest = event.data as JsonRPCRequest | JsonRPCResponse;
      expect(receivedRequest).toEqual(request);
      target.parent.postMessage(response, '*');
    };

    const result = await messagingService.request<MessageResponse>(target, request);
    expect(result.isFooBar).toEqual(true);
  });

  it('can clear pending retries when calling acknowledge()', () => {
    target.onmessage = () => ({});

    const sendSpy = jest.spyOn(messagingService, 'send');

    jest.useFakeTimers();
    messagingService.send(target, request, '*');
    jest.advanceTimersByTime(100);

    messagingService.acknowledge();
    jest.useRealTimers();

    expect(sendSpy).toHaveBeenCalledTimes(3);
  });

  afterEach(() => {
    uiService.unmount();
  });
});
