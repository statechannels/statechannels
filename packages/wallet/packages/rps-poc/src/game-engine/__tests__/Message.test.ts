import Message from '../Message';

const state = '0xa';
const signature = '0x' + '12'.repeat(32) + '34'.repeat(32) + '1c';

it('can be constructed from a state and a signature', () => {
    const message = new Message(state, signature);
    expect(message.state).toEqual(state);;
    expect(message.signature).toEqual(signature);
})

it('can be constructed from a hex string', () => {
    const hexMessage = '0x' + state.substr(2) + signature.substr(2);
    const message = Message.fromHex(hexMessage);
    expect(message.state).toEqual(state);
    expect(message.signature).toEqual(signature);
})

it('toHex works', () => {
    const message = new Message(state, signature);
    expect(message.toHex()).toEqual('0x' + state.substr(2) + signature.substr(2));
})
