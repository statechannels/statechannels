import { Channel, State } from 'fmg-core';

import decode from '../decode';
import BN from 'bn.js';

const gameLibrary = '0x0000000000000000000000000000000000000111';
const channelNonce = 15;
const participantA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const participantB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stateCount = 0;
const turnNum = 5;
const aBal = new BN(4);
const bBal = new BN(5);
const balances = [aBal, bBal];


const testEncodeDecode = (pledge) => {
  it(`${pledge.constructor.name} is the same after encoding and decoding`, () => {
    const encoded = pledge.toHex();
    const decoded = decode(encoded);
    // We need to use JSON stringify due to the BN.js having possible different 
    // internal representations of the same number
    expect(JSON.stringify(decoded)).toEqual(JSON.stringify(pledge));
  });
};

describe('decode', () => {
  testEncodeDecode(new State({channel, turnNum, resolution:balances, stateCount,stateType: State.StateType.Conclude}));
  testEncodeDecode(new State({channel, turnNum, resolution:balances, stateCount,stateType: State.StateType.Game}));
  testEncodeDecode(new State({channel, turnNum, resolution:balances, stateCount,stateType: State.StateType.PostFundSetup}));
  testEncodeDecode(new State({channel, turnNum, resolution:balances, stateCount,stateType: State.StateType.PreFundSetup}));

});