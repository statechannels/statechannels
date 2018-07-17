import { Message } from '../Message';

let state = '0xa';
let signature = '0x' + '12'.repeat(32) + '34'.repeat(32) + '1c';

it('can be constructed from a state and a signature', () => {
    let message = new Message({state, signature});
    expect(message.state).toEqual(state);;
    expect(message.signature).toEqual(signature);
})

it('can be constructed from a hex string', () => {
    let hexMessage = '0x' + state.substr(2) + signature.substr(2);
    let message = new Message({hexMessage});
    expect(message.state).toEqual(state);
    expect(message.signature).toEqual(signature);
})

it('toHex works', () => {
    let message = new Message({state, signature});
    expect(message.toHex()).toEqual('0x' + state.substr(2) + signature.substr(2));
})