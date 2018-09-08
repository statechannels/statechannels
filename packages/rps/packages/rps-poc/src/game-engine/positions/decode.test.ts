import { Channel } from 'fmg-core';

import { hashCommitment, Play } from '.';
import decode from './decode';
import PreFundSetupA from './PreFundSetupA';
import PreFundSetupB from './PreFundSetupB';
import PostFundSetupA from './PostFundSetupA';
import PostFundSetupB from './PostFundSetupB';
import Propose from './Propose';
import Accept from './Accept';
import Reveal from './Reveal';
import Resting from './Resting';
import Conclude from './Conclude';
import BN from 'bn.js';

const gameLibrary = '0x0000000000000000000000000000000000000111';
const channelNonce = 15;
const participantA = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const participantB = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stateCount = 0;
const turnNum = 5;
const stake = new BN(1);
const aBal = new BN(4);
const bBal = new BN(5);
const balances = [aBal, bBal];
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const salt = '0x0000000000000000000000000000000000000000000000000000000000abc123';
const preCommit = hashCommitment(aPlay, salt);

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
  testEncodeDecode(new PreFundSetupA(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(new PreFundSetupB(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(new PostFundSetupA(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(new PostFundSetupB(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(Propose.createWithPlayAndSalt(channel, turnNum, balances, stake, aPlay, salt));
  testEncodeDecode(new Accept(channel, turnNum, balances, stake, preCommit, bPlay));
  testEncodeDecode(new Reveal(channel, turnNum, balances, stake, bPlay, aPlay, salt));
  testEncodeDecode(new Resting(channel, turnNum, balances, stake));
  testEncodeDecode(new Conclude(channel, turnNum, balances));
});
