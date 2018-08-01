import { Channel } from 'fmg-core';

import { hashCommitment, Play } from '.';
import decode from './decode';
import PreFundSetup from './PreFundSetup';
import PostFundSetup from './PostFundSetup';
import Propose from './Propose';
import Accept from './Accept';
import Reveal from './Reveal';
import Resting from './Resting';
import Conclude from './Conclude';

const gameLibrary = '0x0000000000000000000000000000000000000000000000000000000000000111';
const channelNonce = 15;
const participantA = '0x000000000000000000000000000000000000000000000000000000000000000a';
const participantB = '0x000000000000000000000000000000000000000000000000000000000000000b';
const participants = [participantA, participantB];
const channel = new Channel(gameLibrary, channelNonce, participants);
const stateCount = 0;
const turnNum = 5;
const stake = 1;
const aBal = 4;
const bBal = 5;
const balances = [aBal, bBal];
const aPlay = Play.Rock;
const bPlay = Play.Scissors;
const salt = '0x0000000000000000000000000000000000000000000000000000000000abc123';
const preCommit = hashCommitment(aPlay, salt);

const testEncodeDecode = (pledge) => {
  it(`${pledge.constructor.name} is the same after encoding and decoding`, () => {
    const encoded = pledge.toHex();
    const decoded = decode(encoded);
    expect(decoded).toEqual(pledge);
  });
};

describe('decode', () => {
  testEncodeDecode(new PreFundSetup(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(new PostFundSetup(channel, turnNum, balances, stateCount, stake));
  testEncodeDecode(Propose.createWithPlayAndSalt(channel, turnNum, balances, stake, aPlay, salt));
  testEncodeDecode(new Accept(channel, turnNum, balances, stake, preCommit, bPlay));
  testEncodeDecode(new Reveal(channel, turnNum, balances, stake, bPlay, aPlay, salt));
  testEncodeDecode(new Resting(channel, turnNum, balances, stake));
  testEncodeDecode(new Conclude(channel, turnNum, balances));
});
