import {Message} from '@statechannels/client-api-schema';
import _ from 'lodash';
import {Logger} from 'pino';
import delay from 'delay';
import {AbortController} from 'abort-controller';
import {getChannelId} from '@statechannels/nitro-protocol';
import {EventEmitter} from 'eventemitter3';

import {WirePayload} from '../type-aliases';
import {TestPeerWallets} from '../../jest/with-peers-setup-teardown';

import {MessageHandler, MessageServiceInterface} from './types';

export type LatencyOptions = {
  /**
   * The mean delay to delay messages with. If undefined messages are not delayed
   * Otherwise each message is delayed by meanDelay / 2 + Math.random() * meanDelay);
   */
  meanDelay?: number;
  /**
   * How frequently a message should be dropped. Can range from 0 (never dropped) to 1(always dropped)
   */
  dropRate: number;
};

/**
 * A basic message service that is responsible for sending and receiving messages for a collection of engines.
 * All the engines will share the same message service.
 * The message service is responsible for calling pushMessage on the appropriate engines.
 */
export class TestMessageService
  extends EventEmitter<{deliveryRequested: {messages: Message[]}}>
  implements MessageServiceInterface {
  private _handleMessages: (messages: Message[]) => Promise<void>;
  private _options: LatencyOptions;
  private _frozen = false;
  private _messageQueue: Message[] = [];
  protected _destroyed = false;

  /* This is used to signal the delay function to abort */
  protected _abortController: AbortController;
  /**
   * Creates a test message service that can be used in tets
   * @param incomingMessageHandler The message handler to use
   * @param logger An optional logger for logging

   * @returns
   */
  protected constructor(handleMessage: MessageHandler, protected _logger?: Logger) {
    super();
    this._options = {dropRate: 0, meanDelay: undefined};
    this._abortController = new AbortController();
    this._handleMessages = async messages => {
      for (const message of messages) {
        if (!this._destroyed) {
          await handleMessage(message);
        }
      }
    };
  }

  static setLatencyOptions(peerWallets: TestPeerWallets, options: Partial<LatencyOptions>): void {
    const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

    for (const messageService of messageServices) {
      if (!isTestMessageService(messageService)) {
        throw new Error('Can only set latency options on a TestMessageService');
      } else {
        messageService.setLatencyOptions(options);
      }
    }
  }

  static unfreeze(peerWallets: TestPeerWallets): void {
    const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

    for (const messageService of messageServices) {
      if (!isTestMessageService(messageService)) {
        throw new Error('Can only set latency options on a TestMessageService');
      } else {
        messageService.unfreeze();
      }
    }
  }

  static freeze(peerWallets: TestPeerWallets): void {
    const messageServices = [peerWallets.a.messageService, peerWallets.b.messageService];

    for (const messageService of messageServices) {
      if (!isTestMessageService(messageService)) {
        throw new Error('Can only set latency options on a TestMessageService');
      } else {
        messageService.freeze();
      }
    }
  }
  static linkMessageServices(
    messageService1: MessageServiceInterface,
    messageService2: MessageServiceInterface,
    logger?: Logger
  ): void {
    if (!isTestMessageService(messageService1) || !isTestMessageService(messageService2)) {
      throw new Error('Cannot link message services besides the TestMessageService');
    }

    messageService1.on('deliveryRequested', async (messages: Message[]) => {
      logger?.trace(
        {messages: messages.map(formatMessageForLogger)},
        'TestMessageService delivering message to B'
      );

      await messageService2._handleMessages(messages);
    });
    messageService2.on('deliveryRequested', async (messages: Message[]) => {
      logger?.trace(
        {messages: messages.map(formatMessageForLogger)},
        'TestMessageService delivering message to A'
      );

      await messageService1._handleMessages(messages);
    });
  }
  static create(incomingMessageHandler: MessageHandler, logger?: Logger): TestMessageService {
    const service = new TestMessageService(incomingMessageHandler, logger);
    return service;
  }

  public freeze(): void {
    this._frozen = true;
  }
  public async unfreeze(): Promise<void> {
    this._frozen = false;
    await this._handleMessages(this._messageQueue);
  }
  public setLatencyOptions(incomingOptions: Partial<LatencyOptions>): void {
    this._options = _.merge(this._options, incomingOptions);
  }
  async send(messages: Message[]): Promise<void> {
    if (this._frozen) {
      this._messageQueue.push(...messages);
    } else {
      const shouldDrop = Math.random() > 1 - this._options.dropRate;

      if (!shouldDrop) {
        const {meanDelay} = this._options;
        if (meanDelay) {
          const delayAmount = meanDelay / 2 + Math.random() * meanDelay;

          await delay(delayAmount, {signal: this._abortController.signal});
        }
        if (!this._destroyed) {
          this.emit('deliveryRequested', messages);
        }
      } else {
        this._logger?.trace({messages: messages.map(formatMessageForLogger)}, 'Messages dropped');
      }
    }
  }

  async destroy(): Promise<void> {
    this._abortController.abort();
    this._destroyed = true;
    this.removeAllListeners();
  }
}

function formatMessageForLogger(message: Message) {
  const data = message.data as WirePayload;
  return {
    to: message.recipient,
    from: message.sender,
    objectives: data.objectives?.map(o => `${o.type}-${(o.data as any).targetChannelId}`),

    states: data.signedStates?.map(s => {
      const {turnNum, isFinal, signatures, channelNonce, chainId, participants} = s;

      return {
        turnNum,
        isFinal,
        sigCount: signatures.length,
        channelId: getChannelId({
          channelNonce,
          chainId,
          participants: participants.map(p => p.signingAddress),
        }),
      };
    }),
    requests: data.requests?.map(r => `${r.type}-${r.channelId}`),
  };
}

export function isTestMessageService(
  messageService: MessageServiceInterface
): messageService is TestMessageService {
  return '_frozen' in messageService;
}
