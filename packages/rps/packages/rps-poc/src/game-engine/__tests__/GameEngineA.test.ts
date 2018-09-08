import { Channel } from 'fmg-core';

import ChannelWallet from '../../wallet/domain/ChannelWallet';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as GameEngine from '../GameEngine';
import { Play, Resting } from '../positions';
import { PostFundSetupB, Reveal } from '../positions'
import BN from 'bn.js';

it('requires sufficient funds to transition from WaitForPostFundSetupB to ReadyToChooseAPlay', () => {
  const stake =new BN(5);
  const balances = [ new BN(2), new BN(5)]
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const position = new PostFundSetupB(channel, 0, balances, 0, stake);

  const waitForPostFundSetupB = new ApplicationStatesA.WaitForPostFundSetup({ position });

  const gameEngineA = GameEngine.fromState(waitForPostFundSetupB);

  gameEngineA.receivePosition(position);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFunds).toBe(true)
});

it('requires sufficient funds to transition from WaitForResting to ReadyToChooseAPlay', () => {
  const stake = new BN(5);
  const balances = [ new BN(5), new BN(2)];
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const reveal = new Reveal(channel, 3, balances, stake, Play.Rock, Play.Scissors, '0x123');
  const resting = new Resting(channel, 3, balances, stake);

  const waitForResting = new ApplicationStatesA.WaitForResting({ position: reveal });

  const gameEngineA = GameEngine.fromState(waitForResting);

  gameEngineA.receivePosition(resting);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFunds).toBe(true)
});
