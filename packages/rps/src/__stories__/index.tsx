import React from 'react';
import {storiesOf} from '@storybook/react';
import SiteContainer from '../containers/SiteContainer';
import {Provider} from 'react-redux';
// import { OpenGameEntry } from "../components/OpenGameCard";
import * as states from '../redux/game/state';
import {Player} from '../core/players';
import BN from 'bn.js';
// import { OpenGame } from "../redux/open-games/state";
import '../index.scss';
import {SiteState} from '../redux/reducer';
import HomePage from '../components/HomePage';
import LoadingPage from '../components/LoadingPage';
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import {MetamaskErrorType} from '../redux/metamask/actions';
// import CreatingOpenGameModal from "../components/CreatingOpenGameModal";
import LoginErrorPage from '../components/LoginErrorPage';
import {Channel} from 'fmg-core';

const finneyFiveFive = ['0x' + new BN(5).toString(16), '0x' + new BN(5).toString(16)] as [
  string,
  string
];

const finneySixFour = ['0x' + new BN(6).toString(16), '0x' + new BN(4).toString(16)] as [
  string,
  string
];

const fakeStore = state => ({
  dispatch: action => {
    alert(`Action ${action.type} triggered`);
    return action;
  },
  getState: () => state,
  subscribe: () => () => {
    /* empty */
  },
  replaceReducer: () => {
    /* empty */
  }
});

const testState = state => () => (
  <Provider store={fakeStore(state) as any}>
    <SiteContainer />
  </Provider>
);

const libraryAddress = '0x' + '1'.repeat(40);
const channelNonce = 4;
const asPrivateKey = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
const bsPrivateKey = '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72';
const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
const participants: [string, string] = [asAddress, bsAddress];
const roundBuyIn = '0x' + new BN(1).toString(16);

const channel: Channel = {channelType: libraryAddress, nonce: channelNonce, participants};

const base = {
  channel,
  destination: participants,
  commitmentCount: 0
};

const baseWithBuyIn = {
  ...base,
  roundBuyIn
};

export const shared = {
  ...baseWithBuyIn,
  asAddress,
  twitterHandle: 'twtr',
  bsAddress,
  myName: 'Tom',
  opponentName: 'Alex',
  asPrivateKey,
  bsPrivateKey,
  myAddress: '',
  libraryAddress
};

const lobbyState: SiteState = {
  login: {
    loading: false,
    loggedIn: true,
    user: null,
    error: undefined
  },
  metamask: {
    loading: false,
    error: null,
    success: true
  },
  openGames: [],
  overlay: {
    rulesVisible: false,
    walletVisible: false
  },
  game: {
    messageState: {},
    gameState: states.lobby({
      ...shared
    })
  }
};

const initialState: SiteState = {
  ...lobbyState,
  game: {
    messageState: {},
    gameState: states.pickWeapon({
      ...shared,
      player: Player.PlayerA,
      turnNum: 5,
      allocation: finneyFiveFive
    })
  }
};

export function siteStateFromGameState<T extends states.GameState>(gamestate: T): SiteState {
  return {
    ...initialState,
    game: {messageState: {}, gameState: gamestate}
  };
}

const noName = siteStateFromGameState(
  states.noName({
    ...shared
  })
);

const waitingRoom = siteStateFromGameState(
  states.waitingRoom({
    ...shared
  })
);

const gameProposed = siteStateFromGameState(
  states.waitForGameConfirmationA({
    ...shared,
    player: Player.PlayerA,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    allocation: finneySixFour,
    stateCount: 0
  })
);

const confirmGame = siteStateFromGameState(
  states.confirmGameB({
    ...shared,
    player: Player.PlayerB,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    allocation: finneySixFour,
    stateCount: 0
  })
);

// const joinOpenGame = () => alert("join open game");

// const openGame: OpenGame = {
//   address: "test address",
//   name: "test player",
//   stake: "10000000000000000",
//   isPublic: true,
//   createdAt: 0,
// };

storiesOf('Setup', module)
  .add('Loading Page', () => <LoadingPage />)
  .add('Login Error Page', () => <LoginErrorPage error="Login error message" />)
  .add('MetaMask Error Page', () => (
    <MetamaskErrorPage error={{errorType: MetamaskErrorType.WrongNetwork}} />
  ))
  .add('Home Page', () => <HomePage login={() => alert('login')} />)
  .add('Profile Modal', testState(noName));

// storiesOf("Lobby", module)
//   .add("Open Game Entry", () => (
//     <OpenGameEntry openGame={openGame} joinOpenGame={joinOpenGame} />))
//   .add("Open Game Modal", () => (
//     <CreatingOpenGameModal visible={true} createOpenGame={() => ('')} cancelOpenGame={() => ('')} />))
//   .add("Lobby Page", testState(lobbyState));

storiesOf('Game Opening', module)
  .add('Waiting Room', testState(waitingRoom))
  .add('Game Proposed', testState(gameProposed))
  .add('Confirm Game', testState(confirmGame));

storiesOf('Game Screens', module);
storiesOf('Game Over', module);
