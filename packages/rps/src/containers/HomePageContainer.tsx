import {connect} from 'react-redux';

import HomePage from '../components/HomePage';
import * as loginActions from '../redux/login/actions';
import {SiteState} from 'src/redux/reducer';

const mapStateToProps = (siteState: SiteState) => ({
  walletReady: !siteState.wallet.loading,
  metamaskState: siteState.metamask,
});

const mapDispatchToProps = {
  login: loginActions.loginRequest,
};

export default connect(mapStateToProps, mapDispatchToProps)(HomePage);
