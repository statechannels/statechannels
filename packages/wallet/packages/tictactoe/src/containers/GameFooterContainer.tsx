import { connect } from "react-redux";

import GameFooter from "../components/GameFooter";
import * as gameActions from "../redux/game/actions";
import { SiteState } from "../redux/reducer";
import {
  XsPickMove,
  OsPickMove,
  XsPickChallengeMove,
  OsPickChallengeMove,
  XsWaitForOpponentToPickMove,
  OsWaitForOpponentToPickMove,
  PlayAgain,
  WaitToPlayAgain,
} from "../redux/game/state";
import { Player } from "../core/players";
import * as loginActions from "../redux/login/actions";
import * as globalActions from "../redux/global/actions";

function mapStateToProps(state: SiteState) {
  const gameState = state.game.gameState as
    | XsPickMove
    | OsPickMove
    | XsPickChallengeMove
    | OsPickChallengeMove
    | XsWaitForOpponentToPickMove
    | OsWaitForOpponentToPickMove
    | PlayAgain
    | WaitToPlayAgain;
  const { player, turnNum } = gameState;
  const result = gameState.result;
  const isNotOurTurn =
    player === Player.PlayerA ? turnNum % 2 === 0 : turnNum % 2 !== 0;
  const canChallenge =
    isNotOurTurn;
  const challengeOngoing =
    gameState.name === "OS_PICK_CHALLENGE_MOVE" ||
    gameState.name === "XS_PICK_CHALLENGE_MOVE";
    const { myName, opponentName, roundBuyIn, onScreenBalances} = gameState;
  
    const myBalance = onScreenBalances[player];
    const opponentBalance = onScreenBalances[1 - player];
    const name =
    "myName" in state.game.gameState ? state.game.gameState.myName : "";
  const you = "you" in state.game.gameState ? state.game.gameState.you : "";
  return {
    isNotOurTurn,
    canChallenge,
    challengeOngoing,
    result,
    myName,
    opponentName,
    myBalance,
    opponentBalance,
    roundBuyIn,
    showRules: state.overlay.rulesVisible,
    loginDisplayName: name,
    you,
  };
}
const mapDispatchToProps = {
  resign: gameActions.resign,
  createBlockchainChallenge: gameActions.createChallenge,
  logoutRequest: loginActions.logoutRequest,
  rulesRequest: globalActions.toggleRulesVisibility,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GameFooter);
