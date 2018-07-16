import { RpsGame, RpsState } from './game-rules';
import { Channel, padBytes32 } from 'fmg-core';

test('fromHex', () => {
    let channel = new Channel(padBytes32('1234567'), 3141592, ['0x' + '0'.repeat(17) + '123', '0x' + '0'.repeat(17) + '456']);
    let resolution = [1,2];
    let turnNum = 511;
    let stake = 63;
    // TODO: Test InitializationState, FundConfirmationState, and ConclusionState

    let s = RpsGame.restingState({channel, resolution, turnNum, stake});
    let h = s.toHex();
    let s2 = RpsState.fromHex(h)
    expect(s).toEqual(s2)

    let aPlay = RpsGame.Plays.ROCK;
    let salt = padBytes32('abc');
    s = RpsGame.proposeState({channel, resolution, turnNum, stake, aPlay, salt});
    h = s.toHex();
    s2 = RpsState.fromHex(h)
    expect(s.toHex()).toEqual(s2.toHex())

    let bPlay = RpsGame.Plays.SCISSORS;
    let preCommit = '0xabbb5caa7dda850e60932de0934eb1f9d0f59695050f761dc64e443e5030a569';
    s = RpsGame.acceptState({channel, resolution, turnNum, stake, preCommit, bPlay});
    h = s.toHex();
    s2 = RpsState.fromHex(h)
    expect(s).toEqual(s2)

    s = RpsGame.revealState({channel, resolution, turnNum, stake, aPlay, bPlay, salt});
    h = s.toHex();
    s2 = RpsState.fromHex(h)
    expect(s).toEqual(s2)
});