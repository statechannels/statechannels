import ChannelWallet from '../ChannelWallet';
import * as ApplicationStatesA from '../application-states/PlayerA';
import * as GameEngine from '../GameEngine';
import { Play } from '../positions';

it('requires sufficient funds', () => {
  const stake = 5;
  const initialBals = [2, 5];
  const wallet = new ChannelWallet();
  const channel = wallet.address;
  const adjudicator = '0x2718';

  const readyToChooseAPlay = new ApplicationStatesA.ReadyToChooseAPlay({
    channel,
    stake,
    balances: initialBals,
    adjudicator,
    turnNum: 4,
  })

  expect(readyToChooseAPlay).not.toBeNull()

  const gameEngineA = GameEngine.fromState({
    state: readyToChooseAPlay,
    wallet,
  })

  gameEngineA.transitionTo(readyToChooseAPlay);
  expect(
    () => { gameEngineA.choosePlay(Play.Rock) }
  ).toThrow('Insufficient balance for player A.')
})