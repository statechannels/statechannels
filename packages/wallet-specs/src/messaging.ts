import EventEmitter from 'events';
import { AddressableMessage, Message } from './wire-protocol';

interface IMessageService {
  sendMessage: (m: Message) => void;
}

const pretty = o => JSON.stringify(o, null, 2);
class MessageService extends EventEmitter implements IMessageService {
  public sendMessage(m: AddressableMessage) {
    console.log(`Message sent: ${pretty({ to: m.to, type: m.type })}`);
    this.emit('message', m);
  }
}

export const messageService = new MessageService();
