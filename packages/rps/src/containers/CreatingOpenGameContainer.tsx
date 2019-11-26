import { connect } from 'react-redux';

import CreatingOpenGameModal from '../components/CreatingOpenGameModal';
import * as gameActions from '../redux/game/actions';

import { SiteState } from '../redux/reducer';

const mapStateToProps = (state: SiteState) => ({
  visible: state.game.localState.type === 'Lobby',
});

const mapDispatchToProps = {
  createOpenGame: gameActions.createOpenGame,
  cancelOpenGame: gameActions.cancelOpenGame,
};

export default connect(mapStateToProps, mapDispatchToProps)(CreatingOpenGameModal);
