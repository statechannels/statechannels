export enum Queue {
  WALLET,
  GAMEENGINE,
}

export class Message {
  queue: Queue;
  body: string;

  constructor({ queue, body }: { queue: Queue; body: string }) {
    this.queue = queue;
    this.body = body;
  }

  get isWallet(): boolean {
    return this.queue === Queue.WALLET;
  }
}

export function decodeMessage(message: string): Message {
  // If the message does not contain a seperator we assume this message was sent before the encoding change
  if (message.indexOf('-') < 0) {
    return new Message({ queue: Queue.GAMEENGINE, body: message });
  }
  const [queueName, body] = message.split('-');
  if (Queue[queueName] === undefined) {
    throw new Error(`Invalid queue: ${queueName}`);
  }

  return new Message({ queue: Queue[queueName], body });
}

export function encodeMessage(queue: Queue, body: string): string {
  return Queue[queue] + '-' + body;
}
