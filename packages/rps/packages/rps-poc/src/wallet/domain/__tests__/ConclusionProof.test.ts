import { ConclusionProof } from '../ConclusionProof';
import { State, Channel } from 'fmg-core';
import Web3 from 'web3';
import BN from 'bn.js';
import ChannelWallet from '../ChannelWallet';

it.skip("can be constructed", () => { // There's a problem with bn.js equality.
  const web3 = new Web3('');

  const gameLibrary = '0x0000000000000000000000000000000000000111';
  const channelNonce = 15;
  const participantA = web3.eth.accounts.create();
  const participantB = web3.eth.accounts.create();
  const participants = [participantA.address, participantB.address];
  const channel = new Channel(gameLibrary, channelNonce, participants);

  const aBal = new BN("4");
  const bBal = new BN("5");
  const balances = [aBal, bBal];

  const fromState = new State({
    channel,
    stateType: State.StateType.Conclude,
    turnNum: 2,
    resolution: balances,
  });
  const toState = new State({
    channel,
    stateType: State.StateType.Conclude,
    turnNum: 3,
    resolution: balances,
  });

  const fromWallet = new ChannelWallet(participantA.privateKey);
  const toWallet = new ChannelWallet(participantA.privateKey);

  const fromSignature = fromWallet.sign(fromState.toHex());
  const toSignature = toWallet.sign(toState.toHex());

  const proof = new ConclusionProof(fromState.toHex(), toState.toHex(), fromSignature, toSignature);

  expect(proof.fromState).toEqual(fromState);
});
