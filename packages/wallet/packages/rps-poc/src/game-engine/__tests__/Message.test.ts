import Move from '../Move';

const state = '0xa';
const signature = '0x' + '12'.repeat(32) + '34'.repeat(32) + '1c';

it('can be constructed from a state and a signature', () => {
    const move = new Move(state, signature);
    expect(move.state).toEqual(state);
    expect(move.signature).toEqual(signature);
});

it('can be constructed from a hex string', () => {
    const hexMove = '0x' + state.substr(2) + signature.substr(2);
    const move = Move.fromHex(hexMove);
    expect(move.state).toEqual(state);
    expect(move.signature).toEqual(signature);
});

it('toHex works', () => {
    const move = new Move(state, signature);
    expect(move.toHex()).toEqual('0x' + state.substr(2) + signature.substr(2));
});
