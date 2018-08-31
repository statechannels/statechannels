import { Channel } from 'fmg-core';

import ChannelWallet from '../../wallet/domain/ChannelWallet';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as GameEngine from '../GameEngine';
import { Play, Result } from '../positions';
import { PostFundSetup, Resting } from '../positions/'

it('requires sufficient funds to transition from WaitForPostFundSetupB to ReadyToChooseAPlay', () => {
  const stake = 5;
  const balances = [2, 5];
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const position = new PostFundSetup(channel, 0, balances, 0, stake);

  const waitForPostFundSetupB = new ApplicationStatesA.WaitForPostFundSetupB({
    channel,
    stake,
    balances,
    position,
  })

  const gameEngineA = GameEngine.fromState(waitForPostFundSetupB);

  gameEngineA.receivePosition(position);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFundsA).toBe(true)
});

it('requires sufficient funds to transition from WaitForResting to ReadyToChooseAPlay', () => {
  const stake = 5;
  const balances = [5, 2];
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const position = new Resting(channel, 3, balances, stake);

  const waitForResting = new ApplicationStatesA.WaitForResting({
    channel,
    stake,
    balances,
    aPlay: Play.Rock,
    bPlay: Play.Scissors,
    result: Result.YouWin,
    salt: '0x123',
    position,
  })

  const gameEngineA = GameEngine.fromState(waitForResting);

  gameEngineA.receivePosition(position);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFundsB).toBe(true)
});
