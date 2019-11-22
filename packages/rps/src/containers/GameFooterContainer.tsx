import { connect } from 'react-redux';

import GameFooter from '../components/GameFooter';
import * as gameActions from '../redux/game/actions';

import { SiteState } from '../redux/reducer';
import { PlayingState, StateName } from '../redux/game/state';
import { Player } from '../core/players';

function mapStateToProps(state: SiteState) {
  const gameState = state.game.gameState as PlayingState;
  const { player, turnNum } = gameState;
  const isNotOurTurn = player === Player.PlayerA ? turnNum % 2 === 0 : turnNum % 2 !== 0;
  const canChallenge =
    gameState.name === StateName.WaitForRestingA ||
    gameState.name === StateName.WaitForOpponentToPickWeaponA ||
    gameState.name === StateName.WaitForOpponentToPickWeaponB;
  const challengeOngoing = gameState.name === 'PICK_CHALLENGE_WEAPON';
  return {
    isNotOurTurn,
    canChallenge,
    challengeOngoing,
  };
}
const mapDispatchToProps = {
  resign: gameActions.resign,
  createBlockchainChallenge: gameActions.createChallenge,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameFooter);
