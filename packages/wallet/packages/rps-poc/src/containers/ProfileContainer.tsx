import { connect } from 'react-redux';

import ProfilePage from '../components/ProfilePage';
import { SiteState } from '../redux/reducer';

import * as loginActions from '../redux/login/actions';

function mapStateToProps(state: SiteState) {
  return {
  };
}

const mapDispatchToProps = {
  updateProfile: loginActions.updateProfile,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ProfilePage);
