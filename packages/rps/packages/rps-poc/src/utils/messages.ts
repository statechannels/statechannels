export enum Queue {
  WALLET,
  GAMEENGINE,
}

export class Message {
  queue: Queue;
  body: string;

  constructor({queue, body}: {queue: Queue, body: string}) {
    this.queue = queue;
    this.body = body;
  }

  get isWallet(): boolean {
    return this.queue === Queue.WALLET;
  }
}

export function decodeMessage(message: string) : Message {
  const [queueName, body] = message.split('-');
  if (Queue[queueName] === undefined) {
    throw(new Error(`Invalid queue: ${queueName}`));
  }

  return new Message({queue: Queue[queueName], body});
}

export function encodeMessage(queue: Queue, body: string): string {
  return Queue[queue] + '-' + body;
}