import React from 'react';
import { storiesOf } from '@storybook/react';
import { Provider } from 'react-redux';
// import { Button } from '@storybook/react/demo';
import HomePage from '../components/HomePage';
import { OpenGame } from "../redux/open-games/state";
import { OpenGameEntry } from '../components/OpenGameCard';
import Button from '../components/Button';
import Board from '../components/Board';
import { YourMarker, TheirMarker } from '../components/Marker';
import Outcome from '../components/Outcome';
import StatusAndBalances from '../components/StatusAndBalances';
import GameScreen from '../components/GameScreen';
import InsufficientFunds from '../components/InsufficientFunds';
import { Marker, Result, Player, Imperative, Marks } from '../core';
import { scenarios } from '../core';
import * as loginActions from '../redux/login/actions';
import PlayAgain from '../components/PlayAgain';
import BN from "bn.js";
import bnToHex from "../utils/bnToHex";
import * as states from '../redux/game/state';

import GameContainer from '../containers/GameContainer';

import '../index.scss';
import '../index.css';

const finneyFourSix = [new BN(4000000000000000), new BN(6000000000000000)].map(bnToHex) as [string, string]; // in wei
const finneyFiveFive = [new BN(5000000000000000), new BN(5000000000000000)].map(bnToHex) as [string, string];
const finneySixFour = [new BN(6000000000000000), new BN(4000000000000000)].map(bnToHex) as [string, string];

const shared = { ...scenarios.shared };

const initialState = {
  game: {
    messageState: {},
    gameState: states.xsPickMove({
      ...shared,
      stateCount: 1,
      noughts: 0,
      crosses: 0,
      balances: finneyFiveFive,
      onScreenBalances: finneyFiveFive,
      turnNum: 4,
      result: Imperative.Choose,
      player: Player.PlayerA,
      you: Marker.crosses,
    }),
  },
};


const marksMade = (x: Marks) => alert("marks made");
const joinOpenGame = () => alert("join open game");
const playAgain = () => alert('playing again');
const resign = () => alert('resigned');
// const newOpenGame = () => alert("new open game");

storiesOf('HomePage', module).add('Home', () => <HomePage login={loginActions.loginRequest}/>);

const openGame: OpenGame = {
  address:"test address",
  name: "test player",
  stake: "10000000000000000",
  isPublic: true,
  createdAt: 0,
};
storiesOf('LobbyPage', module)
  .add('Open Game Entry', () => <OpenGameEntry 
  openGame={openGame} 
  joinOpenGame={joinOpenGame}
  />)
  .add('Button', () => <Button
  children={"Click Me"}
  onClick={() => alert("button clicked")}
  />);

storiesOf('Board', module)
  .add('Empty', () => <Board noughts={0} crosses={0} marksMade={marksMade} you={Marker.noughts}/>)
  .add('Draw', () => <Board noughts={0b010011100} crosses={0b101100011} marksMade={marksMade} you={Marker.noughts} />)
  .add('O win', () => <Board noughts={0b111000000} crosses={0b000011000} marksMade={marksMade} you={Marker.noughts} />)
  .add('X win', () => <Board noughts={0b100010000} crosses={0b001001001} marksMade={marksMade} you={Marker.noughts} />);

storiesOf('Status', module)
  .add('Your Marker', () => <YourMarker you={Marker.crosses} />)
  .add('Their Marker', () => <TheirMarker you={Marker.crosses} />);

storiesOf('Outcome', module)
  .add('You Win', () => <Outcome result={Result.YouWin} />)
  .add('You Lose', () => <Outcome result={Result.YouLose} />)
  .add('Tie', () => <Outcome result={Result.Tie} />)
  .add('Wait', () => <Outcome result={Imperative.Wait} />)
  .add('Choose', () => <Outcome result={Imperative.Choose} />);

storiesOf('Status and Balances', module)
  .add('You Winning', () => <StatusAndBalances onScreenBalances={finneySixFour} player={Player.PlayerA} you={Marker.crosses} />)
  .add('You Losing', () => <StatusAndBalances onScreenBalances={finneyFourSix} player={Player.PlayerB} you={Marker.crosses} />);


storiesOf('Game Screen', module)
  .add('Waiting', () => <GameScreen
    noughts={0b000100000}
    crosses={0b000001001}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Imperative.Wait}
    onScreenBalances={finneySixFour}
    marksMade={marksMade}
    resign={resign}
  />)
  .add('Choosing', () => <GameScreen
    noughts={0b000100010}
    crosses={0b000001001}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Imperative.Choose}
    onScreenBalances={finneyFourSix}
    marksMade={marksMade}
    resign={resign}
  />)
  .add('X win', () => <GameScreen
    noughts={0b100100000}
    crosses={0b001001001}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Result.YouWin}
    onScreenBalances={finneySixFour}
    marksMade={marksMade}
    resign={resign}
  />)
  .add('Double X win', () => <GameScreen
    noughts={0b010100110}
    crosses={0b101011001}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Result.YouWin}
    onScreenBalances={finneySixFour}
    marksMade={marksMade}
    resign={resign}
/>)
  .add('O win', () => <GameScreen
    noughts={0b100100100}
    crosses={0b000011001}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Result.YouLose}
    onScreenBalances={finneyFourSix}
    marksMade={marksMade}
    resign={resign}
  />)
  .add('Tie', () => <GameScreen
    noughts={0b101100010}
    crosses={0b010011101}
    you={Marker.crosses}
    player={Player.PlayerA}
    result={Result.Tie}
    onScreenBalances={finneyFiveFive}
    marksMade={marksMade}
    resign={resign}
  />);

const fakeStore = (state) => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => (state),
  subscribe: () => (() => {/* empty */ }),
  replaceReducer: () => { /* empty */ },
  playAgain: () => { /* empty */ },
  resign: () => { /* empty */ },
});

const testState = (state) => (
  () => (
    <Provider store={fakeStore(state)}>
      <GameContainer />
    </Provider>
  )
);

storiesOf('App (reading from the fake store)', module)
  .add('test initial state', testState(initialState));

  storiesOf('Post game', module)
    .add('Play Again', () => <PlayAgain
      noughts={0}
      crosses={0}
      you={Marker.noughts} // TODO this should take either value
      player={Player.PlayerA}
      result={Result.YouWin}
      onScreenBalances={finneySixFour}
      marksMade={marksMade}
      playAgain={playAgain}
      resign={resign}
      />)
    .add('Insufficient Funds', () => <InsufficientFunds
      noughts={0}
      crosses={0}
      you={Marker.noughts} // TODO this should take either value
      player={Player.PlayerA}
      result={Result.YouWin}
      onScreenBalances={finneySixFour}
      marksMade={marksMade}
      />);