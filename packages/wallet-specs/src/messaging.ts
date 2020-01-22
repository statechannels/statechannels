import EventEmitter from 'events';

import { AddressableMessage, Message } from './wire-protocol';
import { log } from './utils';

import { pretty } from '.';

interface IMessageService {
  sendMessage: (m: Message) => void;
}

class MessageService extends EventEmitter implements IMessageService {
  public sendMessage(m: AddressableMessage) {
    let states;
    if ('signedStates' in m) {
      states = m.signedStates.map(({ state, signatures }) => ({
        state: state.turnNum,
        channel: state.channel.channelNonce,
        signatures,
      }));
    }
    log(
      pretty({
        MESSAGE: {
          to: m.to,
          type: m.type,
          states,
        },
      })
    );

    this.emit('message', m);
  }
}

export const messageService = new MessageService();
