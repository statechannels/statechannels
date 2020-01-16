import {connect} from 'react-redux';

import GameFooter from '../components/GameFooter';
import * as gameActions from '../redux/game/actions';
import {SiteState} from '../redux/reducer';

function mapStateToProps(state: SiteState) {
  const localState = state.game.localState;
  const localStateName = localState.type;
  const canChallenge =
    ['B.WeaponChosen', 'A.WeaponAndSaltChosen', 'A.WaitForRestart', 'B.WaitForRestart'].indexOf(
      localStateName
    ) > -1;
  const challengeOngoing = false; // TODO revisit this
  return {
    canChallenge,
    challengeOngoing,
  };
}
const mapDispatchToProps = {
  resign: gameActions.resign,
  createBlockchainChallenge: gameActions.challenge,
};

export default connect(mapStateToProps, mapDispatchToProps)(GameFooter);
