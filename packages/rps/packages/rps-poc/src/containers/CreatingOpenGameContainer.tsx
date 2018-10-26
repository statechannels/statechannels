import { connect } from 'react-redux';

import CreatingOpenGameModal from '../components/CreatingOpenGameModal';
import * as gameActions from '../redux/game/actions';
import * as gameStates from '../redux/game/state';

import { SiteState } from '../redux/reducer';

const mapStateToProps = (state: SiteState) => ({
  visible: state.game.gameState.name === gameStates.StateName.CreatingOpenGame,
});

const mapDispatchToProps = {
  createOpenGame: gameActions.createOpenGame,
  cancelOpenGame: gameActions.cancelOpenGame,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreatingOpenGameModal);
