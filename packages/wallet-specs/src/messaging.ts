import EventEmitter from 'events';
import { pretty } from '.';
import { AddressableMessage, Message } from './wire-protocol';

interface IMessageService {
  sendMessage: (m: Message) => void;
}

class MessageService extends EventEmitter implements IMessageService {
  public sendMessage(m: AddressableMessage) {
    let states;
    if ('signedStates' in m) {
      states = m.signedStates.map(({ state, signatures }) => ({
        state: state.turnNum,
        signatures,
      }));
    }
    console.log(
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
