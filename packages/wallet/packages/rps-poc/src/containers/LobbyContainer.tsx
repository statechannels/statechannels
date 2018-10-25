import { connect } from 'react-redux';

import LobbyPage from '../components/LobbyPage';
import * as actions from '../redux/game/actions';

import { SiteState } from '../redux/reducer';
import { OpenGame } from '../redux/open-games/state';

const mapStateToProps = (state: SiteState) => ({
  openGames: state.openGames as OpenGame[],
});

const mapDispatchToProps = {
  joinOpenGame: actions.joinOpenGame,
  newOpenGame: actions.newOpenGame,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LobbyPage);
