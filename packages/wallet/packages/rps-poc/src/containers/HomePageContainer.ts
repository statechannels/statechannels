import { connect } from 'react-redux';

import HomePage from '../components/HomePage';
import * as loginActions from '../redux/actions/login';

const mapStateToProps = (state) => ({
  loggedIn: state.login.loggedIn,
});

const mapDispatchToProps = {
  login: loginActions.loginRequest,
  logout: loginActions.logoutRequest,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HomePage)
