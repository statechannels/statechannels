import {ChannelWallet as BrowserWallet} from '@statechannels/browser-wallet';

import {isJsonRpcNotification, Message, PushMessageRequest} from '../../client-api-schema/src';
import {
  MessageHandler,
  MessageServiceFactory,
  MessageServiceInterface
} from '../../server-wallet/src/message-service/types';

export class BrowserServerMessageService implements MessageServiceInterface {
  constructor(private browserWallet: BrowserWallet) {}
  public async send(message: Message[]): Promise<void> {
    const convertedMessages = message.map(generatePushMessage);
    await Promise.all(convertedMessages.map(m => this.browserWallet.pushMessage(m, 'dummyDomain')));
  }

  public async destroy(): Promise<void> {
    this.browserWallet.destroy();
  }

  public static createFactory(browserWallet: BrowserWallet): MessageServiceFactory {
    return (handler: MessageHandler) => {
      browserWallet.onSendMessage(m => {
        if (isJsonRpcNotification(m)) {
          handler(m.params as Message);
        }
      });

      return new BrowserServerMessageService(browserWallet);
    };
  }
}
function generatePushMessage(messageParams: Message): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: messageParams
  };
}
