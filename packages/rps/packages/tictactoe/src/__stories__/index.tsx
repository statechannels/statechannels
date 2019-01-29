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

const finneyFourSix = [new BN(4000000000000000), new BN(6000000000000000)].map(
  bnToHex
) as [string, string]; // in wei
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

const initialState: SiteState = {
  login: {
    loading: false,
    loggedIn: true,
    user: null,
  },
  metamask: {
    loading: false,
    error: null,
    success: true,
  },
  openGames: [],
  rules: {
    visible: false,
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

export function siteStateFromGameState<T extends states.GameState>(
  gamestate: T
): SiteState {
  return {
    ...initialState,
    game: { messageState: {}, gameState: gamestate },
  };
}

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
  states.playAgain({
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
    turnNum: 6,
    balances: finneyFourSix,
  })
);

const xsTie = siteStateFromGameState(
  states.playAgain({
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

const xsWaitToPlayAgain = siteStateFromGameState(
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
    noughts: 0b000000000,
    crosses: 0b000000001,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Imperative.Wait,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneySixFour,
  })
);

const osVictory = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b001001001,
    crosses: 0b000010010,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.YouWin,
    onScreenBalances: finneySixFour,
    turnNum: 6,
    balances: finneySixFour,
  })
);

const osDefeat = siteStateFromGameState(
  states.playAgain({
    ...shared,
    noughts: 0b000001011,
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
  states.gameOver({
    ...shared,
    noughts: 0b000011000,
    crosses: 0b111000000,
    you: Marker.noughts,
    player: Player.PlayerA,
    result: Result.YouWin,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneyFiveFive,
    ourTurn: true,
  })
);

const loserGameOver = siteStateFromGameState(
  states.gameOver({
    ...shared,
    noughts: 0b000011000,
    crosses: 0b111000000,
    you: Marker.noughts,
    player: Player.PlayerB,
    result: Result.YouLose,
    onScreenBalances: finneyFiveFive,
    turnNum: 6,
    balances: finneyFiveFive,
    ourTurn: false,
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

storiesOf("Lobby", module).add("Open Game Entry", () => (
  <OpenGameEntry openGame={openGame} joinOpenGame={joinOpenGame} />
));

storiesOf("Game Screens / Crosses", module)
  .add("Choosing", testState(initialState))
  .add("Waiting", testState(xsWaiting))
  .add("Winning", testState(xsVictory))
  .add("Losing", testState(xsDefeat))
  .add("Drawing", testState(xsTie))
  .add("Wait to Play Again", testState(xsWaitToPlayAgain));

storiesOf("Game Screens / Noughts", module)
  .add("Choosing", testState(osChoosing))
  .add("Waiting", testState(osWaiting))
  .add("Winning", testState(osVictory))
  .add("Losing", testState(osDefeat))
  .add("Drawing", testState(osTie));

storiesOf("Game Over", module)
  .add("Winner", testState(winnerGameOver))
  .add("Loser", testState(loserGameOver));
