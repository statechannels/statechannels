import { encodeMessage, decodeMessage, Queue, Message } from '../messages';

describe("encodeMessage", () => {
  it("works", () => {
    expect(encodeMessage(Queue.WALLET, 'foo')).toEqual('WALLET-foo');
    expect(encodeMessage(Queue.GAMEENGINE, 'foo')).toEqual('GAMEENGINE-foo');
  });
})

describe("decodeMessage", () => {
  it("works", () => {
    let message = decodeMessage('WALLET-body') as Message;
    expect(message.queue).toEqual(Queue.WALLET);
    expect(message.body).toEqual('body');

    message = decodeMessage('GAMEENGINE-someMove') as Message;
    expect(message.queue).toEqual(Queue.GAMEENGINE);
    expect(message.body).toEqual('someMove');

    expect(() => {decodeMessage('NOTAQUEUE-someMessage')}).toThrowError("Invalid queue: NOTAQUEUE");
  });
})