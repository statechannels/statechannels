import React from "react";
import { storiesOf } from "@storybook/react";
import SiteContainer from "../containers/SiteContainer";
import { Provider } from "react-redux";
import { OpenGameEntry } from "../components/OpenGameCard";
import * as states from "../redux/game/state";
import { Marker, Player, Imperative, Result } from "../core";
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

const finneyFourSix = [new BN(4000000000000000), new BN(6000000000000000)].map(
  bnToHex
) as [string, string]; // in wei
const finneyFiveFive = [new BN(5000000000000000), new BN(5000000000000000)].map(
  bnToHex
) as [string, string];
const finneySixFour = [new BN(6000000000000000), new BN(4000000000000000)].map(
  bnToHex
) as [string, string];
const finneyZeroTen = ["0x0000000000000000000000000000000000000000000000000000000000000000",
"0x2386f26fc10000"] as [string, string];

const fakeStore = state => ({
  dispatch: action => {
    console.log(`Action ${action.type} triggered`);
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
    gameState: states.xsPickMove({
      ...shared,
      noughts: 0b000000000,
      crosses: 0b000000000,
      you: Marker.crosses,
      player: Player.PlayerA,
      result: Imperative.Choose,
      onScreenBalances: finneyFourSix,
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

const xsWaiting = siteStateFromGameState(
  states.xsWaitForOpponentToPickMove({
    ...shared,
    noughts: 0b000000000,
    crosses: 0b000000001,
    you: Marker.crosses,
    player: Player.PlayerA,
    result: Imperative.Wait,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneySixFour,
  })
);

const xsVictory = siteStateFromGameState(
  states.waitToPlayAgain({
    ...shared,
    noughts: 0b000010010,
    crosses: 0b001001001,
    you: Marker.crosses,
    player: Player.PlayerA,
    result: Result.YouWin,
    onScreenBalances: finneySixFour,
    turnNum: 6,
    balances: finneySixFour,
  })
);

const xsDefeat = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b111010000,
    crosses: 0b000001011,
    you: Marker.crosses,
    player: Player.PlayerA,
    result: Result.YouLose,
    onScreenBalances: finneyFourSix,
    turnNum: 7,
    balances: finneyFourSix,
  })
);

const xsTie = siteStateFromGameState(
  states.waitToPlayAgain({
    ...shared,
    noughts: 0b010011100,
    crosses: 0b101100011,
    you: Marker.crosses,
    player: Player.PlayerA,
    result: Result.Tie,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneyFiveFive,
  })
);

const osChoosing = siteStateFromGameState(
  states.osPickMove({
    ...shared,
    noughts: 0b000000000,
    crosses: 0b000000001,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Imperative.Choose,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneySixFour,
  })
);

const osWaiting = siteStateFromGameState(
  states.osWaitForOpponentToPickMove({
    ...shared,
    noughts: 0b010000000,
    crosses: 0b000000001,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Imperative.Wait,
    onScreenBalances: finneyFiveFive,
    turnNum: 7,
    balances: finneySixFour,
  })
);

const osVictory = siteStateFromGameState(
  states.waitToPlayAgain({
    ...shared,
    noughts: 0b001001001,
    crosses: 0b100010010,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.YouWin,
    onScreenBalances: finneySixFour,
    turnNum: 7,
    balances: finneySixFour,
  })
);

const osDefeat = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b000001001,
    crosses: 0b111010000,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.YouLose,
    onScreenBalances: finneyFourSix,
    turnNum: 6,
    balances: finneyFourSix,
  })
);

const osTie = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b010011100,
    crosses: 0b101100011,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.Tie,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneyFiveFive,
  })
);

const winnerGameOver = siteStateFromGameState(
  states.waitToPlayAgain({
    ...shared,
    noughts: 0b000011000,
    crosses: 0b111000000,
    you: Marker.crosses,
    player: Player.PlayerA,
    result: Result.GameOverWin,
    onScreenBalances: finneyZeroTen,
    turnNum: 106,
    balances: finneyZeroTen,
    ourTurn: true,
  })
);

const loserGameOver = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b000011000,
    crosses: 0b111000000,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.GameOverLose,
    onScreenBalances: finneyZeroTen,
    turnNum: 106,
    balances: finneyZeroTen,
    ourTurn: false,
  })
);

const xsPickgWithRules: SiteState = {
  ...lobbyState,
    overlay: {
      rulesVisible: true,
      walletVisible: false,
    },
    game: {
      messageState: {},
      gameState: states.xsPickMove({
        ...shared,
        noughts: 0b000000000,
        crosses: 0b000000000,
        you: Marker.crosses,
        player: Player.PlayerA,
        result: Imperative.Choose,
        onScreenBalances: finneyFourSix,
        turnNum: 5,
        balances: finneyFiveFive,
      }),
    },
  };




const joinOpenGame = () => console.log("join open game");

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
  <MetamaskErrorPage error={ {errorType: MetamaskErrorType.WrongNetwork} }/>))
.add("Home Page", () => (
  <HomePage login={()=>console.log('login')}/>))
.add("Profile Modal", testState(noName));

storiesOf("Lobby", module)
.add("Open Game Entry", () => (
  <OpenGameEntry openGame={openGame} joinOpenGame={joinOpenGame} />))
.add("Open Game Modal", () => (
  <CreatingOpenGameModal visible={true} createOpenGame={()=>('')} cancelOpenGame={()=>('')}/>))
.add("Lobby Page", testState(lobbyState));

storiesOf("Game Opening", module)
.add("Waiting Room", testState(waitingRoom))
.add("Game Proposed", testState(gameProposed))
.add("Confirm Game", testState(confirmGame));

storiesOf("Game Screens / Crosses", module)
  .add("Choosing", testState(initialState))
  .add("Waiting", testState(xsWaiting))
  .add("Winning", testState(xsVictory))
  .add("Losing", testState(xsDefeat))
  .add("Drawing", testState(xsTie));

storiesOf("Game Screens / Noughts", module)
  .add("Choosing", testState(osChoosing))
  .add("Waiting", testState(osWaiting))
  .add("Winning", testState(osVictory))
  .add("Losing", testState(osDefeat))
  .add("Drawing", testState(osTie));

storiesOf("Game Over", module)
  .add("Winner", testState(winnerGameOver))
  .add("Loser", testState(loserGameOver));

storiesOf("Rules", module)
  .add("Xs Picking With Rules", testState(xsPickgWithRules));
