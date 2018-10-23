import { connect } from 'react-redux';

import LobbyPage from '../components/LobbyPage';
import * as actions from '../redux/game/actions';
import * as loginActions from '../redux/login/actions';

import { SiteState } from '../redux/reducer';
import { OpenGame } from '../redux/open-games/state';

const mapStateToProps = (state: SiteState) => ({
  openGames: state.openGames as OpenGame[],
});

const mapDispatchToProps = {
  joinOpenGame: actions.joinOpenGame,
  newOpenGame: actions.newOpenGame,
  logoutRequest: loginActions.logoutRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(LobbyPage);
