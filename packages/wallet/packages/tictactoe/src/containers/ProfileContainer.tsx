import { connect } from 'react-redux';

import ProfilePage from '../components/ProfilePage';
import { SiteState } from '../redux/reducer';

import * as gameActions from '../redux/game/actions';
import * as loginActions from '../redux/login/actions';

function mapStateToProps(state: SiteState) {
  return {
  };
}

const mapDispatchToProps = {
  updateProfile: gameActions.updateProfile,
  logout: loginActions.logoutRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfilePage);
