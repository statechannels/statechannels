import { Channel } from 'fmg-core';

import ChannelWallet from '../../wallet/domain/ChannelWallet';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as GameEngine from '../GameEngine';
import Move from '../Move';
import { Play, Result } from '../positions';
import { PostFundSetup, Resting } from '../positions/'

it('requires sufficient funds to transition from WaitForPostFundSetupB to ReadyToChooseAPlay', () => {
  const stake = 5;
  const balances = [2, 5];
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);
  const adjudicator = '0x2718';

  const pledge = new PostFundSetup(channel, 0, balances, 0, stake);
  const move = new Move(pledge.toHex(), wallet.sign(pledge.toHex()));

  const waitForPostFundSetupB = new ApplicationStatesA.WaitForPostFundSetupB({
    channel,
    stake,
    balances,
    adjudicator,
    move,
  })

  const gameEngineA = GameEngine.fromState({
    state: waitForPostFundSetupB,
    wallet,
  })

  gameEngineA.receiveMove(move);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFundsA).toBe(true)
});

it('requires sufficient funds to transition from WaitForResting to ReadyToChooseAPlay', () => {
  const stake = 5;
  const balances = [5, 2];
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);
  const adjudicator = '0x2718';

  const pledge = new Resting(channel, 3, balances, stake);
  const move = new Move(pledge.toHex(), wallet.sign(pledge.toHex()));

  const waitForResting = new ApplicationStatesA.WaitForResting({
    channel,
    stake,
    balances,
    adjudicator,
    aPlay: Play.Rock,
    bPlay: Play.Scissors,
    result: Result.YouWin,
    salt: '0x123',
    move,
  })

  const gameEngineA = GameEngine.fromState({
    state: waitForResting,
    wallet,
  })

  gameEngineA.receiveMove(move);

  expect(gameEngineA.state instanceof ApplicationStatesA.InsufficientFundsB).toBe(true)
});