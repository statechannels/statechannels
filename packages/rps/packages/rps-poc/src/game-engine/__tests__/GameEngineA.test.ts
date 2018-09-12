import { Channel } from 'fmg-core';

import ChannelWallet from '../../wallet/domain/ChannelWallet';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as GameEngine from '../GameEngine';
import { Play, Resting, Accept, Propose } from '../positions';
import { PostFundSetupB, Reveal } from '../positions'
import BN from 'bn.js';

it('normally can transition to states', () => {
  const stake =new BN(3);
  const balances = [new BN(15), new BN(15)]
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const position = new PostFundSetupB(channel, 0, balances, 0, stake);

  const waitForPostFundSetupB = new ApplicationStatesA.WaitForPostFundSetup({ position });

  const gameEngineA = GameEngine.fromState(waitForPostFundSetupB);

  gameEngineA.receivePosition(position);

  expect(gameEngineA.state instanceof ApplicationStatesA.ChoosePlay).toBe(true)
})

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


it('receives Accept positions correctly', () => {
  const start = 5
  const stake = new BN(2);
  const balances = [ new BN(start), new BN(start)];
  const aWinsBalances = [new BN(start).add(stake), new BN(start).sub(stake)]
  const bWinsBalances = [new BN(start).sub(stake), new BN(start).add(stake)]
  const wallet = new ChannelWallet();
  const channel = new Channel(wallet.address, 456, [wallet.address, '0x123']);

  const turnNum = 0;
  const aPlay = Play.Rock;
  const salt = '0x123'
  const propose = Propose.createWithPlayAndSalt(
    channel,
    turnNum,
    balances,
    stake,
    aPlay,
    '0x123'
  )
  const waitForAccept = new ApplicationStatesA.WaitForAccept({
    position: propose,
    aPlay,
    salt,
  })

  const gameEngineA = GameEngine.fromState(waitForAccept);

  const preComit = propose.preCommit;
  const bPlay = Play.Scissors;
  const accept = new Accept(channel, turnNum + 1, bWinsBalances, stake, preComit, bPlay)
  gameEngineA.receivePosition(accept);

  expect(gameEngineA.state instanceof ApplicationStatesA.WaitForResting).toBe(true)
  expect(gameEngineA.state.balances).toEqual(aWinsBalances)
})