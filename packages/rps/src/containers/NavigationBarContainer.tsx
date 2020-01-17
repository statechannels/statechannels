import {connect} from 'react-redux';

import NavigationBar from '../components/NavigationBar';
import * as loginActions from '../redux/login/actions';
import * as globalActions from '../redux/global/actions';

import {SiteState} from '../redux/reducer';

const mapStateToProps = (state: SiteState) => {
  const name = 'name' in state.game.localState ? state.game.localState.name : '';
  return {
    showRules: state.overlay.rulesVisible,
    loginDisplayName: name,
    metamaskState: state.metamask,
  };
};

const mapDispatchToProps = {
  logoutRequest: loginActions.logoutRequest,
  rulesRequest: globalActions.toggleRulesVisibility,
};

export default connect(mapStateToProps, mapDispatchToProps)(NavigationBar);
