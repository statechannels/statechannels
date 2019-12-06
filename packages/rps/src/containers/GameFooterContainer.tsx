import {connect} from 'react-redux';

import GameFooter from '../components/GameFooter';
import * as gameActions from '../redux/game/actions';

import {SiteState} from '../redux/reducer';
import {isPlayerA} from '../redux/game/state';

function mapStateToProps(state: SiteState) {
  const localState = state.game.localState;
  const turnNum = state.game.channelState ? Number(state.game.channelState.turnNum) : 0;
  const isNotOurTurn = isPlayerA(localState) ? turnNum % 2 === 0 : turnNum % 2 !== 0;
  const localStateName = localState.type;
  const canChallenge = localStateName === 'A.ChooseWeapon'; // TODO revisit this
  const challengeOngoing = false; // TODO revisit this
  return {
    isNotOurTurn,
    canChallenge,
    challengeOngoing,
  };
}
const mapDispatchToProps = {
  resign: gameActions.resign,
  createBlockchainChallenge: () => {
    /* TODO */
  },
};

export default connect(mapStateToProps, mapDispatchToProps)(GameFooter);
