import React from "react";
import { storiesOf } from "@storybook/react";
import SiteContainer from "../containers/SiteContainer";
import { Provider } from "react-redux";
import { OpenGameEntry } from "../components/OpenGameCard";
import * as states from "../redux/game/state";
import { Player } from "../core";
import BN from "bn.js";
import bnToHex from "../utils/bnToHex";
import { OpenGame } from "../redux/open-games/state";
import "../index.scss";
import { scenarios } from "../core";
import { SiteState } from "../redux/reducer";
import HomePage from "../components/HomePage";
import LoadingPage from "../components/LoadingPage";
import MetamaskErrorPage from '../components/MetamaskErrorPage';
import { MetamaskErrorType } from '../redux/metamask/actions';
import CreatingOpenGameModal from "../components/CreatingOpenGameModal";
import LoginErrorPage from '../components/LoginErrorPage';

const finneyFiveFive = [new BN(5000000000000000), new BN(5000000000000000)].map(
  bnToHex
) as [string, string];
const finneySixFour = [new BN(6000000000000000), new BN(4000000000000000)].map(
  bnToHex
) as [string, string];

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
  },
});

const testState = state => () => (
  <Provider store={fakeStore(state)}>
    <SiteContainer />
  </Provider>
);

const shared = {
  ...scenarios.shared,
  stateCount: 1,
  roundBuyIn: bnToHex(new BN(1000000000000000)),
  myAddress: '',
};

const lobbyState: SiteState = {
  login: {
    loading: false,
    loggedIn: true,
    user: null,
    error: undefined,
  },
  metamask: {
    loading: false,
    error: null,
    success: true,
  },
  openGames: [],
  overlay: {
    rulesVisible: false,
    walletVisible: false,
  },
  game: {
    messageState: {},
    gameState: states.lobby({
      ...shared,
    }),
  },
};

const initialState: SiteState = {
  ...lobbyState,
  game: {
    messageState: {},
    gameState: states.pickMove({
      ...shared,
      player: Player.PlayerA,
      turnNum: 5,
      balances: finneyFiveFive,
    }),
  },
};

export function siteStateFromGameState<T extends states.GameState>(
  gamestate: T
): SiteState {
  return {
    ...initialState,
    game: { messageState: {}, gameState: gamestate },
  };
}

const noName = siteStateFromGameState(
  states.noName({
    ...shared,
  })
);

const waitingRoom = siteStateFromGameState(
  states.waitingRoom({
    ...shared,
  })
);

const gameProposed = siteStateFromGameState(
  states.waitForGameConfirmationA({
    ...shared,
    player: Player.PlayerA,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneySixFour,
    stateCount: 0,
  })
);

const confirmGame = siteStateFromGameState(
  states.confirmGameB({
    ...shared,
    player: Player.PlayerB,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneySixFour,
    stateCount: 0,
  })
);

const joinOpenGame = () => alert("join open game");

const openGame: OpenGame = {
  address: "test address",
  name: "test player",
  stake: "10000000000000000",
  isPublic: true,
  createdAt: 0,
};

storiesOf("Setup", module)
  .add("Loading Page", () => (
    <LoadingPage />))
  .add("Login Error Page", () => (
    <LoginErrorPage error='Login error message' />))
  .add("MetaMask Error Page", () => (
    <MetamaskErrorPage error={{ errorType: MetamaskErrorType.WrongNetwork }} />))
  .add("Home Page", () => (
    <HomePage login={() => alert('login')} />))
  .add("Profile Modal", testState(noName));

storiesOf("Lobby", module)
  .add("Open Game Entry", () => (
    <OpenGameEntry openGame={openGame} joinOpenGame={joinOpenGame} />))
  .add("Open Game Modal", () => (
    <CreatingOpenGameModal visible={true} createOpenGame={() => ('')} cancelOpenGame={() => ('')} />))
  .add("Lobby Page", testState(lobbyState));

storiesOf("Game Opening", module)
  .add("Waiting Room", testState(waitingRoom))
  .add("Game Proposed", testState(gameProposed))
  .add("Confirm Game", testState(confirmGame));

storiesOf("Game Screens", module)
storiesOf("Game Over", module)
