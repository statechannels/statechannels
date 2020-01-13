import {connect} from 'react-redux';

import NavigationBar from '../components/NavigationBar';
import * as loginActions from '../redux/login/actions';
import * as globalActions from '../redux/global/actions';
import * as autoPlayerActions from '../redux/auto-player/actions';

import {SiteState} from '../redux/reducer';

const mapStateToProps = (state: SiteState) => {
  const name = 'name' in state.game.localState ? state.game.localState.name : '';
  return {
    showRules: state.overlay.rulesVisible,
    loginDisplayName: name,
    autoPlayerA: state.autoPlayer.enabled && state.autoPlayer.player == 'A',
    autoPlayerB: state.autoPlayer.enabled && state.autoPlayer.player == 'B',
  };
};

const mapDispatchToProps = {
  logoutRequest: loginActions.logoutRequest,
  rulesRequest: globalActions.toggleRulesVisibility,
  enableAutoPlayerA: autoPlayerActions.startAutoPlayerA,
  enableAutoPlayerB: autoPlayerActions.startAutoPlayerB,
  disableAutoPlayerA: autoPlayerActions.stopAutoPlayerA,
  disableAutoPlayerB: autoPlayerActions.stopAutoPlayerB,
};

export default connect(mapStateToProps, mapDispatchToProps)(NavigationBar);
