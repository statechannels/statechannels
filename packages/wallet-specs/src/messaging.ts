import EventEmitter from 'events';
import { AddressableMessage, Message } from './wire-protocol';

interface IMessageService {
  sendMessage: (m: Message) => void;
}

const pretty = o => JSON.stringify(o, null, 2);
class MessageService extends EventEmitter implements IMessageService {
  public sendMessage(m: AddressableMessage) {
    switch (m.type) {
      case 'SendStates':
        const states = m.signedStates.map(({ state, signatures }) => ({
          state: state.turnNum,
          signatures,
        }));
        console.log(
          `Message sent: ${pretty({ to: m.to, type: m.type, states })}`
        );
        break;
      default:
        console.log(`Message sent: ${pretty({ to: m.to, type: m.type })}`);
    }
    this.emit('message', m);
  }
}

export const messageService = new MessageService();
