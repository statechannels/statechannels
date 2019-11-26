import { connect } from 'react-redux';

import GameFooter from '../components/GameFooter';
import * as gameActions from '../redux/game/actions';

import { SiteState } from '../redux/reducer';
import { PlayingState, PlayingStateName } from '../redux/game/state';

function mapStateToProps(state: SiteState) {
  const localState = state.game.localState as PlayingState;
  const { player } = localState;
  const turnNum = state.game.channelState ? Number(state.game.channelState.turnNum) : 0;
  const isNotOurTurn = player === 'A' ? turnNum % 2 === 0 : turnNum % 2 !== 0;
  const localStateName: PlayingStateName = localState.type;
  const canChallenge = localStateName === 'ChooseWeapon'; // TODO revisit this
  const challengeOngoing = localState.name === 'PICK_CHALLENGE_WEAPON';
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
